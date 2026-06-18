// externals/jemp-temporal-worker/src/activities/save-plan.ts
import { getSupabaseClient } from 'src/utils/supabase'
import { PlannedSession } from 'src/plan-generation/generate-plan'

const nz = (v: number): number | null => (v > 0 ? v : null)

// ── Date helpers (ported from edge function) ──────────────────────────────────

function computePlanDates() {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const jsDow = today.getUTCDay()
  const todayDow = jsDow === 0 ? 7 : jsDow
  const currentMonday = new Date(today)
  currentMonday.setUTCDate(today.getUTCDate() - (todayDow - 1))
  const nextMonday = new Date(currentMonday)
  nextMonday.setUTCDate(currentMonday.getUTCDate() + 7)
  const endDate = new Date(nextMonday)
  endDate.setUTCDate(nextMonday.getUTCDate() + 27)
  return { today, todayDow, currentMonday, nextMonday, endDate }
}

function getScheduledDates(sessionDow: number, todayDow: number, currentMonday: Date, nextMonday: Date): Date[] {
  const dates: Date[] = []
  if (sessionDow >= todayDow) {
    const d = new Date(currentMonday)
    d.setUTCDate(currentMonday.getUTCDate() + sessionDow - 1)
    dates.push(d)
  }
  for (let week = 0; week < 4; week++) {
    const d = new Date(nextMonday)
    d.setUTCDate(nextMonday.getUTCDate() + week * 7 + sessionDow - 1)
    dates.push(d)
  }
  return dates
}

// ── Main activity ─────────────────────────────────────────────────────────────

export async function savePlan(input: {
  userId: string
  planName: string
  planDescription: string
  sessions: PlannedSession[]
  environmentIds: string[]
}): Promise<string> {
  const { userId, planName, planDescription, sessions, environmentIds } = input
  const supabase = getSupabaseClient()

  // ── 1. Resolve slugs → UUIDs ─────────────────────────────────────────────
  const allCategorySlugs = [...new Set(sessions.flatMap(s => s.blocks.map(b => b.focused_category_slug)))]
  const allBlockTypeSlugs = [...new Set(sessions.flatMap(s => s.blocks.map(b => b.block_type)))]
  const allExerciseSlugs = [...new Set(sessions.flatMap(s => s.blocks.flatMap(b => b.exercises.map(e => e.exercise_slug))))]

  const [{ data: categoriesRows }, { data: blockTypeRows }, { data: exerciseRows }] = await Promise.all([
    supabase.from('categories').select('id, slug').in('slug', allCategorySlugs),
    supabase.from('block_types').select('id, slug').in('slug', allBlockTypeSlugs),
    supabase.from('exercises').select('id, slug').in('slug', allExerciseSlugs),
  ])

  const categoryMap = new Map((categoriesRows ?? []).map((c: any) => [c.slug, c.id]))
  const blockTypeMap = new Map((blockTypeRows ?? []).map((b: any) => [b.slug, b.id]))
  const exerciseMap = new Map((exerciseRows ?? []).map((e: any) => [e.slug, e.id]))

  // ── 2. Compute plan dates ────────────────────────────────────────────────
  const { today, todayDow, currentMonday, nextMonday, endDate } = computePlanDates()

  // ── 3. Deactivate existing active plan ───────────────────────────────────
  await supabase.from('workout_plans').update({ status: 'completed' }).eq('user_id', userId).eq('status', 'active')
  await supabase.from('workout_sessions').update({ status: 'cancelled' }).eq('user_id', userId).eq('status', 'scheduled')

  // ── 4. Insert workout_plan ───────────────────────────────────────────────
  const { data: insertedPlan, error: planInsertError } = await supabase
    .from('workout_plans')
    .insert({
      user_id: userId,
      name: planName,
      description: planDescription,
      status: 'active',
      start_date: today.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      duration_weeks: 4,
    })
    .select('id')
    .single()

  if (planInsertError || !insertedPlan) throw new Error(`Failed to insert workout_plan: ${planInsertError?.message}`)
  const planId = insertedPlan.id

  // ── 5. Insert sessions → blocks → exercises ──────────────────────────────

  type PlanBlockRecord = {
    id: string
    order_index: number
    block_type_id: string
    focused_category_id: string | null
  }
  type PlanExerciseRecord = {
    id: string
    exercise_id: string
    order_index: number
    target_sets: number | null
    target_reps_min: number | null
    target_reps_max: number | null
    target_duration_seconds: number | null
    target_distance_meters: number | null
    target_rest_seconds: number | null
    target_load_type: string | null
    target_load_value: number | null
  }

  const planBlocksBySessionId = new Map<string, PlanBlockRecord[]>()
  const planExercisesByBlockId = new Map<string, PlanExerciseRecord[]>()

  for (const aiSession of sessions) {
    const { data: insertedSession, error: sessionInsertError } = await supabase
      .from('workout_plan_sessions')
      .insert({
        plan_id: planId,
        name: aiSession.name,
        description: aiSession.description,
        session_type: aiSession.session_type,
        mode_slug: aiSession.mode_slug,
        day_of_week: aiSession.day_of_week,
        order_index: aiSession.order_index,
        estimated_duration_minutes: nz(aiSession.estimated_duration_minutes),
        pause_between_sets: aiSession.pause_between_sets > 0 ? aiSession.pause_between_sets : 90,
        environment_id: (aiSession as any).environment_id ?? environmentIds[0] ?? null,
      })
      .select('id')
      .single()

    if (sessionInsertError || !insertedSession) {
      console.error('Failed to insert session:', sessionInsertError?.message)
      continue
    }

    const sessionId = insertedSession.id
    const sessionBlocks: PlanBlockRecord[] = []

    const blocksToInsert = aiSession.blocks
      .map((block) => {
        const blockTypeId = blockTypeMap.get(block.block_type)
        if (!blockTypeId) return null
        return {
          workout_plan_session_id: sessionId,
          order_index: block.order_index,
          block_type_id: blockTypeId,
          focused_category_id: categoryMap.get(block.focused_category_slug) ?? null,
        }
      })
      .filter(Boolean) as Array<{
        workout_plan_session_id: string
        order_index: number
        block_type_id: string
        focused_category_id: string | null
      }>

    if (blocksToInsert.length === 0) continue

    const { data: insertedBlocks, error: blocksInsertError } = await supabase
      .from('workout_plan_session_blocks')
      .insert(blocksToInsert)
      .select('id, order_index, block_type_id, focused_category_id')

    if (blocksInsertError || !insertedBlocks) {
      console.error('Failed to insert blocks:', blocksInsertError?.message)
      continue
    }

    for (const insertedBlock of insertedBlocks) {
      const aiBlock = aiSession.blocks.find((b) => b.order_index === insertedBlock.order_index)
      if (!aiBlock) continue

      sessionBlocks.push({
        id: insertedBlock.id,
        order_index: insertedBlock.order_index,
        block_type_id: insertedBlock.block_type_id,
        focused_category_id: insertedBlock.focused_category_id,
      })

      const exercisesToInsert = aiBlock.exercises
        .map((ex) => {
          const exerciseId = exerciseMap.get(ex.exercise_slug)
          if (!exerciseId) return null
          return {
            workout_plan_session_block_id: insertedBlock.id,
            exercise_id: exerciseId,
            order_index: ex.order_index,
            notes: ex.notes || null,
            target_sets: nz(ex.target_sets),
            target_reps_min: nz(ex.target_reps_min),
            target_reps_max: nz(ex.target_reps_max),
            target_duration_seconds: nz(ex.target_duration_seconds),
            target_distance_meters: nz(ex.target_distance_meters),
            target_rest_seconds: ex.target_rest_seconds >= 0 ? ex.target_rest_seconds : null,
            target_load_type: ex.target_load_type,
            target_load_value: ex.target_load_value >= 0 ? ex.target_load_value : null,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)

      if (exercisesToInsert.length === 0) continue

      const { data: insertedExercises, error: exInsertError } = await supabase
        .from('workout_plan_session_block_exercises')
        .insert(exercisesToInsert)
        .select('id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, target_duration_seconds, target_distance_meters, target_rest_seconds, target_load_type, target_load_value')

      if (exInsertError || !insertedExercises) {
        console.error('Failed to insert exercises:', exInsertError?.message)
        continue
      }

      planExercisesByBlockId.set(insertedBlock.id, insertedExercises.map((e: any) => ({
        id: e.id,
        exercise_id: e.exercise_id,
        order_index: e.order_index,
        target_sets: e.target_sets,
        target_reps_min: e.target_reps_min,
        target_reps_max: e.target_reps_max,
        target_duration_seconds: e.target_duration_seconds,
        target_distance_meters: e.target_distance_meters,
        target_rest_seconds: e.target_rest_seconds,
        target_load_type: e.target_load_type,
        target_load_value: e.target_load_value,
      })))
    }

    planBlocksBySessionId.set(sessionId, sessionBlocks)
  }

  // ── 6. Expand into dated workout_sessions ────────────────────────────────

  const { data: allPlanSessions } = await supabase
    .from('workout_plan_sessions')
    .select('id, day_of_week, name, description, session_type, estimated_duration_minutes, pause_between_sets, environment_id')
    .eq('plan_id', planId)

  if (!allPlanSessions || allPlanSessions.length === 0) {
    return planId
  }

  const workoutSessionsToInsert: any[] = []
  for (const planSession of allPlanSessions) {
    const dates = getScheduledDates(planSession.day_of_week, todayDow, currentMonday, nextMonday)
    for (const date of dates) {
      workoutSessionsToInsert.push({
        user_id: userId,
        workout_plan_id: planId,
        workout_plan_session_id: planSession.id,
        name: planSession.name,
        description: planSession.description,
        session_type: planSession.session_type,
        scheduled_at: date.toISOString(),
        status: 'scheduled',
        estimated_duration_minutes: planSession.estimated_duration_minutes,
        pause_between_sets: (planSession as any).pause_between_sets ?? 90,
        environment_id: (planSession as any).environment_id,
      })
    }
  }

  const { data: insertedWorkoutSessions, error: wsInsertError } = await supabase
    .from('workout_sessions')
    .insert(workoutSessionsToInsert)
    .select('id, workout_plan_session_id')

  if (wsInsertError || !insertedWorkoutSessions) {
    throw new Error(`Failed to insert workout_sessions: ${wsInsertError?.message}`)
  }

  // ── 7. Expand blocks + exercises for each workout_session ─────────────────

  const wsBlocksToInsert: any[] = []
  for (const ws of insertedWorkoutSessions) {
    const planBlocks = planBlocksBySessionId.get(ws.workout_plan_session_id) ?? []
    for (const planBlock of planBlocks) {
      wsBlocksToInsert.push({
        workout_session_id: ws.id,
        workout_plan_session_block_id: planBlock.id,
        order_index: planBlock.order_index,
        block_type_id: planBlock.block_type_id,
        focused_category_id: planBlock.focused_category_id,
      })
    }
  }

  const { data: insertedWSBlocks, error: wsbInsertError } = await supabase
    .from('workout_session_blocks')
    .insert(wsBlocksToInsert)
    .select('id, workout_plan_session_block_id')

  if (wsbInsertError || !insertedWSBlocks) {
    throw new Error(`Failed to insert workout_session_blocks: ${wsbInsertError?.message}`)
  }

  const wsExercisesToInsert: any[] = []
  for (const wsBlock of insertedWSBlocks) {
    const planExercises = planExercisesByBlockId.get(wsBlock.workout_plan_session_block_id) ?? []
    for (const planEx of planExercises) {
      wsExercisesToInsert.push({
        workout_session_block_id: wsBlock.id,
        workout_plan_session_block_id: wsBlock.workout_plan_session_block_id,
        workout_plan_session_block_exercise_id: planEx.id,
        exercise_id: planEx.exercise_id,
        order_index: planEx.order_index,
        target_sets: planEx.target_sets,
        target_reps_min: planEx.target_reps_min,
        target_reps_max: planEx.target_reps_max,
        target_duration_seconds: planEx.target_duration_seconds,
        target_distance_meters: planEx.target_distance_meters,
        target_rest_seconds: planEx.target_rest_seconds,
        target_load_type: planEx.target_load_type,
        target_load_value: planEx.target_load_value,
      })
    }
  }

  if (wsExercisesToInsert.length > 0) {
    const { error: wsExInsertError } = await supabase
      .from('workout_session_block_exercises')
      .insert(wsExercisesToInsert)
    if (wsExInsertError) {
      throw new Error(`Failed to insert workout_session_block_exercises: ${wsExInsertError.message}`)
    }
  }

  // ── 8. Create assessments if needed ─────────────────────────────────────

  const { data: lastEntry } = await supabase
    .from('metric_entries')
    .select('created_at')
    .eq('user_id', userId)
    .eq('source_type', 'assessment')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const fourWeeksAgo = new Date()
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
  if (!lastEntry || new Date(lastEntry.created_at) < fourWeeksAgo) {
    await supabase.rpc('fn_create_user_assessments', { p_user_id: userId })
  }

  return planId
}
