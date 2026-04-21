import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "@supabase/supabase-js"
import { OpenAI } from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"
import { computePlanDates, getScheduledDates } from "./helpers/date-helpers.ts"
import { GENERATE_PLAN_SYSTEM_PROMPT } from "./prompts.ts"
import { planSchema } from "./schemas.ts"



// Converts 0 or negative numbers to null (respects DB CHECK constraints)
const nz = (v: number): number | null => (v > 0 ? v : null)

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!

  // Verify caller via their JWT
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const userId = user.id
  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const openai = new OpenAI({ apiKey: openaiApiKey })

  try {
    // ── 1. User profile + equipment + category levels ───────────────────────

    const { data: userProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("*, user_category_levels(category_id, level_score), user_equipments(equipments(id, slug))")
      .eq("id", userId)
      .single()

    if (profileError || !userProfile) {
      return new Response(JSON.stringify({ error: "User profile not found" }), { status: 404 })
    }

    const equipmentIds = (userProfile.user_equipments as any[]).map((e) => e.equipments.id) as string[]
    const categoryLevels = userProfile.user_category_levels as Array<{ category_id: string; level_score: number }>

    // ── 2. Sport + required categories + user focus ─────────────────────────

    const { data: sportData } = await supabase
      .from("sports")
      .select("slug, sport_category_relevance(relevance, categories(slug))")
      .eq("id", userProfile.sport_id)
      .single()

    const sportRequiredCategories = ((sportData?.sport_category_relevance ?? []) as any[])
      .map((r) => ({ category: r.categories?.slug, relevance: r.relevance }))
      .sort((a, b) => b.relevance - a.relevance)

    const { data: targetedCategoriesData } = await supabase
      .from("user_targeted_categories")
      .select("priority, categories(slug)")
      .eq("user_id", userId)

    const userFocusCategories = ((targetedCategoriesData ?? []) as any[])
      .map((t) => ({ category: t.categories?.slug, priority: t.priority }))
      .sort((a, b) => a.priority - b.priority)

    // ── 3. Filter exercises by equipment + category level ───────────────────

    const [{ data: equipmentMatches }, { data: allEquipmentRows }] = await Promise.all([
      supabase.from("exercise_equipments").select("exercise_id").in("equipment_id", equipmentIds),
      supabase.from("exercise_equipments").select("exercise_id"),
    ])

    const userEquipmentExerciseIds = [...new Set((equipmentMatches ?? []).map((e: any) => e.exercise_id))]
    const allEquipmentExerciseIds = [...new Set((allEquipmentRows ?? []).map((e: any) => e.exercise_id))]

    const exerciseSelect = "*, categories(id, slug), exercise_blocks(block_types(slug))"

    const equipmentExercisesPromise = userEquipmentExerciseIds.length > 0
      ? supabase.from("exercises").select(exerciseSelect).in("id", userEquipmentExerciseIds)
      : Promise.resolve({ data: [] })

    const bodyweightExercisesPromise = allEquipmentExerciseIds.length > 0
      ? supabase.from("exercises").select(exerciseSelect).not("id", "in", `(${allEquipmentExerciseIds.join(",")})`)
      : supabase.from("exercises").select(exerciseSelect)

    const [{ data: equipmentExercises }, { data: bodyweightExercises }] = await Promise.all([
      equipmentExercisesPromise,
      bodyweightExercisesPromise,
    ])

    const allExercises = [...(equipmentExercises ?? []), ...(bodyweightExercises ?? [])]

    const levelMap = new Map(categoryLevels.map((cl) => [cl.category_id, cl.level_score]))

    const filteredExercises = allExercises.filter((exercise: any) => {
      if (!exercise.category_id) return true
      const userLevel = levelMap.get(exercise.category_id)
      if (userLevel === undefined) return false
      return userLevel >= exercise.min_level && userLevel <= exercise.max_level
    })

    const exercisesString = filteredExercises
      .map((e: any) => {
        const blocks = (e.exercise_blocks as any[])
          ?.map((b: any) => b.block_types?.slug)
          .filter(Boolean)
          .join(", ") ?? ""
        return `[${e.slug}]: ${e.name}, category: ${e.categories?.slug}, blocks: [${blocks}]`
      })
      .join("\n")

    const userDataString = JSON.stringify({
      sport_slug: sportData?.slug,
      preferred_workout_days: userProfile.preferred_workout_days,
      preferred_session_duration: userProfile.preferred_session_duration,
      category_levels: categoryLevels.map((cl) => ({ category_id: cl.category_id, level_score: cl.level_score })),
      sport_required_categories: sportRequiredCategories,
      user_focus_categories: userFocusCategories,
    }, null, 2)

    // ── 4. Generate plan with OpenAI ────────────────────────────────────────

    const completion = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [{ role: "system", content: GENERATE_PLAN_SYSTEM_PROMPT(exercisesString, userDataString) }],
      response_format: zodResponseFormat(planSchema, "data"),
      max_completion_tokens: 5000,
    })

    const plan = JSON.parse(completion.choices[0].message.content!) as z.infer<typeof planSchema>

    // ── 5. Build slug → UUID lookup maps ────────────────────────────────────

    const allCategorySlugs = [...new Set(plan.sessions.flatMap((s) => s.blocks.map((b) => b.focused_category_slug)))]
    const allBlockTypeSlugs = [...new Set(plan.sessions.flatMap((s) => s.blocks.map((b) => b.block_type)))]
    const allExerciseSlugs = [...new Set(plan.sessions.flatMap((s) => s.blocks.flatMap((b) => b.exercises.map((e) => e.exercise_slug))))]

    const [{ data: categoriesRows }, { data: blockTypeRows }, { data: exerciseRows }] = await Promise.all([
      supabase.from("categories").select("id, slug").in("slug", allCategorySlugs),
      supabase.from("block_types").select("id, slug").in("slug", allBlockTypeSlugs),
      supabase.from("exercises").select("id, slug").in("slug", allExerciseSlugs),
    ])

    const categoryMap = new Map((categoriesRows ?? []).map((c: any) => [c.slug, c.id]))
    const blockTypeMap = new Map((blockTypeRows ?? []).map((b: any) => [b.slug, b.id]))
    const exerciseMap = new Map((exerciseRows ?? []).map((e: any) => [e.slug, e.id]))

    // ── 6. Compute plan dates ────────────────────────────────────────────────

    const { today, todayDow, currentMonday, nextMonday, endDate } = computePlanDates()

    // ── 7. Insert workout_plan ───────────────────────────────────────────────

    const { data: insertedPlan, error: planInsertError } = await supabase
      .from("workout_plans")
      .insert({
        user_id: userId,
        name: plan.name,
        description: plan.description,
        status: "active",
        start_date: today.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        duration_weeks: 4,
      })
      .select("id")
      .single()

    if (planInsertError || !insertedPlan) {
      throw new Error(`Failed to insert workout_plan: ${planInsertError?.message}`)
    }

    const planId = insertedPlan.id

    // ── 8. Insert plan template: sessions → blocks → exercises ──────────────

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

    // Maps for expansion into actual sessions
    const planBlocksBySessionId = new Map<string, PlanBlockRecord[]>()
    const planExercisesByBlockId = new Map<string, PlanExerciseRecord[]>()

    for (const aiSession of plan.sessions) {
      const { data: insertedSession, error: sessionInsertError } = await supabase
        .from("workout_plan_sessions")
        .insert({
          plan_id: planId,
          name: aiSession.name,
          description: aiSession.description,
          session_type: aiSession.session_type,
          day_of_week: aiSession.day_of_week,
          order_index: aiSession.order_index,
          estimated_duration_minutes: nz(aiSession.estimated_duration_minutes),
        })
        .select("id")
        .single()

      if (sessionInsertError || !insertedSession) {
        console.error("Failed to insert session:", sessionInsertError?.message)
        continue
      }

      const sessionId = insertedSession.id
      const sessionBlocks: PlanBlockRecord[] = []

      // Prepare blocks — skip any where block type not found in DB
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
        .from("workout_plan_session_blocks")
        .insert(blocksToInsert)
        .select("id, order_index, block_type_id, focused_category_id")

      if (blocksInsertError || !insertedBlocks) {
        console.error("Failed to insert blocks:", blocksInsertError?.message)
        continue
      }

      // Insert exercises per block
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
          .filter(Boolean)

        if (exercisesToInsert.length === 0) continue

        const { data: insertedExercises, error: exInsertError } = await supabase
          .from("workout_plan_session_block_exercises")
          .insert(exercisesToInsert)
          .select("id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, target_duration_seconds, target_distance_meters, target_rest_seconds, target_load_type, target_load_value")

        if (exInsertError || !insertedExercises) {
          console.error("Failed to insert exercises:", exInsertError?.message)
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

    // ── 9. Fetch inserted plan sessions ─────────────────────────────────────

    const { data: allPlanSessions } = await supabase
      .from("workout_plan_sessions")
      .select("id, day_of_week, name, description, session_type, estimated_duration_minutes")
      .eq("plan_id", planId)

    if (!allPlanSessions || allPlanSessions.length === 0) {
      return new Response(
        JSON.stringify({ plan_id: planId, warning: "No sessions were inserted" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )
    }

    // ── 10. Expand plan sessions into dated workout_sessions ─────────────────
    // Partial current week (days >= today) + 4 complete weeks

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
          status: "scheduled",
          estimated_duration_minutes: planSession.estimated_duration_minutes,
        })
      }
    }

    const { data: insertedWorkoutSessions, error: wsInsertError } = await supabase
      .from("workout_sessions")
      .insert(workoutSessionsToInsert)
      .select("id, workout_plan_session_id")

    if (wsInsertError || !insertedWorkoutSessions) {
      throw new Error(`Failed to insert workout_sessions: ${wsInsertError?.message}`)
    }

    // ── 11. Expand blocks for each workout_session ───────────────────────────

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
      .from("workout_session_blocks")
      .insert(wsBlocksToInsert)
      .select("id, workout_plan_session_block_id")

    if (wsbInsertError || !insertedWSBlocks) {
      throw new Error(`Failed to insert workout_session_blocks: ${wsbInsertError?.message}`)
    }

    // ── 12. Expand exercises for each workout_session_block ──────────────────

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
        .from("workout_session_block_exercises")
        .insert(wsExercisesToInsert)

      if (wsExInsertError) {
        throw new Error(`Failed to insert workout_session_block_exercises: ${wsExInsertError.message}`)
      }
    }

    // ── 13. Return result ────────────────────────────────────────────────────

    return new Response(
      JSON.stringify({
        plan_id: planId,
        start_date: today.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        sessions_scheduled: insertedWorkoutSessions.length,
      }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (err: any) {
    console.error("Error generating plan:", err)
    return new Response(
      JSON.stringify({ error: err?.message ?? "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
})
