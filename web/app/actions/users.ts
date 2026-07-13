'use server'

import { asI18n } from '@/lib/i18n'
import type { AssessmentUserProfile } from '@/lib/score-calculators/assessment-score'
import { calculateAssessmentScore } from '@/lib/score-calculators/assessment-score'
import { supabase } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ─── Auth helpers ─────────────────────────────────────────────

async function requireUser() {
  const cookieStore = await cookies()
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { },
      },
    }
  )
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

async function requireAdmin() {
  const user = await requireUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return user
}

// ─── Types ────────────────────────────────────────────────────

export type UserListRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  sport: string | null
  role: 'user' | 'admin' | 'tester' | 'affiliate'
  has_onboarded: boolean | null
  last_active_at: string | null
}

export type UserProfile = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  birth_date: string | null
  gender: 'male' | 'female' | 'other' | null
  height_in_cm: number | null
  weight_in_kg: number | null
  role: 'user' | 'admin' | 'tester' | 'affiliate'
  has_onboarded: boolean | null
  preferred_language: string | null
  timezone: string | null
  preferred_session_duration: string | null
  preferred_workout_days: number[] | null
  load_score: number
  load_profile: string
  created_at: string | null
  last_active_at: string | null
  sport: { slug: string; name_de: string } | null
  environments: { slug: string; name_de: string }[]
  equipments: { slug: string; name_de: string }[]
  equipment_environments: { equipment_slug: string; environment_slugs: string[] }[]
  focus_categories: { slug: string; name_de: string; priority: number }[]
  category_levels: { slug: string; name_de: string; level_score: number }[]
}

export type WorkoutSessionRow = {
  id: string
  name: string
  session_type: string | null
  status: string
  scheduled_at: string | null
  completed_at: string | null
}

export type UserActivePlan = {
  id: string
  name: string
  status: string
  duration_weeks: number
  start_date: string
  end_date: string
  completedCount: number
  totalCount: number
  sessions: WorkoutSessionRow[]
  executedSessions: { id: string; workout_plan_session_id: string | null; status: string }[]
}

// ─── Plan structure types ─────────────────────────────────────

export type PlanExercise = {
  id: string
  order_index: number
  exercise_name: string
  notes: string | null
  target_sets: number | null
  target_reps_min: number | null
  target_reps_max: number | null
  target_load_type: string | null
  target_load_value: number | null
  target_duration_seconds: number | null
  target_distance_meters: number | null
  target_rest_seconds: number | null
}

export type PlanBlock = {
  id: string
  order_index: number
  block_type_slug: string | null
  focused_category_slug: string | null
  exercises: PlanExercise[]
}

export type PlanSessionWithBlocks = {
  id: string
  name: string
  day_of_week: number
  session_type: string | null
  mode_slug: string | null
  estimated_duration_minutes: number | null
  pause_between_sets: number | null
  order_index: number
  blocks: PlanBlock[]
}

export type PlanStructure = {
  planSessions: PlanSessionWithBlocks[]
}

// ─── Session detail types ─────────────────────────────────────

export type PerformedSet = {
  set_number: number
  side: string | null
  performed_reps: number | null
  performed_load_value: number | null
  performed_rpe: number | null
  performed_duration_seconds: number | null
  performed_distance_meters: number | null
}

export type SessionDetailExercise = {
  id: string
  order_index: number
  exercise_name: string
  target_sets: number | null
  target_load_type: string | null
  performed_sets: PerformedSet[]
}

export type SessionDetailBlock = {
  id: string
  order_index: number
  block_type_slug: string | null
  exercises: SessionDetailExercise[]
}

export type SessionDetail = {
  id: string
  name: string
  status: string
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  blocks: SessionDetailBlock[]
}

// ─── getUsers ─────────────────────────────────────────────────

export async function getUsers(
  search: string,
  page: number,
): Promise<{ users: UserListRow[]; total: number }> {
  await requireAdmin()

  const PAGE_SIZE = 25
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('user_profiles')
    .select('id, first_name, last_name, email, role, has_onboarded, last_active_at, sport:sports(name_i18n)', { count: 'exact' })
    .order('last_active_at', { ascending: false, nullsFirst: false })
    .range(from, to)

  if (search.trim()) {
    query = query.or(
      `first_name.ilike.%${search.trim()}%,last_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`
    )
  }

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  const users: UserListRow[] = (data ?? []).map(row => ({
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    sport: row.sport ? asI18n((row.sport as any).name_i18n).de || null : null,
    role: row.role as UserListRow['role'],
    has_onboarded: row.has_onboarded,
    last_active_at: row.last_active_at,
  }))

  return { users, total: count ?? 0 }
}

// ─── fetchUserProfile ─────────────────────────────────────────

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  await requireAdmin()

  const [{ data, error }, { data: equipEnvData }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select(`
        id, first_name, last_name, email, birth_date, gender,
        height_in_cm, weight_in_kg, role, has_onboarded,
        preferred_language, timezone, preferred_session_duration,
        preferred_workout_days, load_score, load_profile,
        created_at, last_active_at,
        sport:sports(slug, name_i18n),
        user_environments(environment:environments(slug, name_i18n)),
        user_equipments!user_equipments_user_id_fkey(equipment:equipments!user_equipments_equipment_id_fkey(slug, name_i18n)),
        user_targeted_categories(priority, category:categories(slug, name_i18n)),
        user_category_levels(level_score, category:categories(slug, name_i18n))
      `)
      .eq('id', userId)
      .single(),
    (supabase as any)
      .from('user_equipment_environments')
      .select('equipment_id, environment_id, equipment:equipments(slug), environment:environments(slug)')
      .eq('user_id', userId),
  ])

  if (error && error.code === 'PGRST116') return null
  if (error) throw new Error(error.message)
  if (!data) return null

  const d = data as any

  // Group environment slugs by equipment slug
  const equipEnvMap = new Map<string, string[]>()
  for (const row of (equipEnvData ?? []) as any[]) {
    const eqSlug = row.equipment?.slug
    const envSlug = row.environment?.slug
    if (!eqSlug || !envSlug) continue
    if (!equipEnvMap.has(eqSlug)) equipEnvMap.set(eqSlug, [])
    equipEnvMap.get(eqSlug)!.push(envSlug)
  }

  return {
    id: d.id,
    first_name: d.first_name,
    last_name: d.last_name,
    email: d.email,
    birth_date: d.birth_date,
    gender: d.gender,
    height_in_cm: d.height_in_cm,
    weight_in_kg: d.weight_in_kg,
    role: d.role,
    has_onboarded: d.has_onboarded,
    preferred_language: d.preferred_language,
    timezone: d.timezone,
    preferred_session_duration: d.preferred_session_duration,
    preferred_workout_days: d.preferred_workout_days,
    load_score: d.load_score,
    load_profile: d.load_profile,
    created_at: d.created_at,
    last_active_at: d.last_active_at,
    sport: d.sport ? { slug: d.sport.slug, name_de: asI18n(d.sport.name_i18n).de } : null,
    environments: (d.user_environments ?? []).map((r: any) => ({
      slug: r.environment.slug,
      name_de: asI18n(r.environment.name_i18n).de,
    })),
    equipments: (d.user_equipments ?? []).map((r: any) => ({
      slug: r.equipment.slug,
      name_de: asI18n(r.equipment.name_i18n).de,
    })),
    equipment_environments: [...equipEnvMap.entries()].map(([equipment_slug, environment_slugs]) => ({
      equipment_slug,
      environment_slugs,
    })),
    focus_categories: (d.user_targeted_categories ?? [])
      .sort((a: any, b: any) => a.priority - b.priority)
      .map((r: any) => ({
        slug: r.category.slug,
        name_de: asI18n(r.category.name_i18n).de,
        priority: r.priority,
      })),
    category_levels: (d.user_category_levels ?? []).map((r: any) => ({
      slug: r.category.slug,
      name_de: asI18n(r.category.name_i18n).de,
      level_score: r.level_score,
    })),
  }
}

// ─── fetchUserActivePlan ──────────────────────────────────────

export async function fetchUserActivePlan(userId: string): Promise<UserActivePlan | null> {
  await requireAdmin()

  const { data: plan, error: planError } = await supabase
    .from('workout_plans')
    .select('id, name, status, duration_weeks, start_date, end_date')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (planError && planError.code === 'PGRST116') return null
  if (planError) throw new Error(planError.message)
  if (!plan) return null

  const { data: sessions, error: sessionsError } = await supabase
    .from('workout_sessions')
    .select('id, name, session_type, status, scheduled_at, completed_at, workout_plan_session_id')
    .eq('workout_plan_id', plan.id)
    .order('scheduled_at', { ascending: true })

  if (sessionsError) throw new Error(sessionsError.message)

  const rawSessions = (sessions ?? []) as any[]

  const allSessions: WorkoutSessionRow[] = rawSessions.map(s => ({
    id: s.id,
    name: s.name,
    session_type: s.session_type,
    status: s.status,
    scheduled_at: s.scheduled_at,
    completed_at: s.completed_at,
  }))

  const executedSessions = rawSessions.map(s => ({
    id: s.id as string,
    workout_plan_session_id: s.workout_plan_session_id as string | null,
    status: s.status as string,
  }))

  return {
    id: plan.id,
    name: plan.name,
    status: plan.status,
    duration_weeks: plan.duration_weeks,
    start_date: plan.start_date,
    end_date: plan.end_date,
    completedCount: allSessions.filter(s => s.status === 'completed').length,
    totalCount: allSessions.length,
    sessions: allSessions,
    executedSessions,
  }
}

// ─── fetchUserPlanStructure ───────────────────────────────────

export async function fetchUserPlanStructure(planId: string): Promise<PlanStructure | null> {
  await requireAdmin()

  const { data, error } = await supabase
    .from('workout_plan_sessions')
    .select(`
      id, name, day_of_week, session_type, mode_slug, estimated_duration_minutes, pause_between_sets, order_index,
      workout_plan_session_blocks(
        id, order_index,
        block_type:block_types(slug),
        focused_category:categories(slug),
        workout_plan_session_block_exercises(
          id, order_index, notes,
          target_sets, target_reps_min, target_reps_max,
          target_load_type, target_load_value, target_duration_seconds,
          target_distance_meters, target_rest_seconds,
          exercise:exercises(name)
        )
      )
    `)
    .eq('plan_id', planId)
    .order('order_index')

  if (error) throw new Error(error.message)
  if (!data) return null

  const planSessions: PlanSessionWithBlocks[] = (data as any[]).map(session => ({
    id: session.id,
    name: session.name,
    day_of_week: session.day_of_week,
    session_type: session.session_type,
    mode_slug: session.mode_slug,
    estimated_duration_minutes: session.estimated_duration_minutes,
    pause_between_sets: session.pause_between_sets,
    order_index: session.order_index,
    blocks: (session.workout_plan_session_blocks ?? [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((block: any) => ({
        id: block.id,
        order_index: block.order_index,
        block_type_slug: block.block_type?.slug ?? null,
        focused_category_slug: block.focused_category?.slug ?? null,
        exercises: (block.workout_plan_session_block_exercises ?? [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((ex: any) => ({
            id: ex.id,
            order_index: ex.order_index,
            exercise_name: ex.exercise?.name ?? '—',
            notes: ex.notes,
            target_sets: ex.target_sets,
            target_reps_min: ex.target_reps_min,
            target_reps_max: ex.target_reps_max,
            target_load_type: ex.target_load_type,
            target_load_value: ex.target_load_value,
            target_duration_seconds: ex.target_duration_seconds,
            target_distance_meters: ex.target_distance_meters,
            target_rest_seconds: ex.target_rest_seconds,
          })),
      })),
  }))

  return { planSessions }
}

// ─── fetchUserAssessmentScores ────────────────────────────────

export type UserAssessmentScore = {
  id: string
  completed_at: string
  assessment_slug: string
  assessment_name: string
  category_slug: string
  category_name: string
  metric_unit: string
  value: number | null
  score: number | null
}

export async function fetchUserAssessmentScores(userId: string): Promise<UserAssessmentScore[]> {
  await requireAdmin()

  const { data, error } = await supabase
    .from('user_assessments')
    .select(`
      id, completed_at,
      assessment:assessments (
        slug, name_i18n,
        category:categories ( slug, name_i18n ),
        metric:metrics!measured_metric_id ( unit )
      ),
      metric_entries ( value, score )
    `)
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  if (error) throw new Error(error.message)

  // Deduplicate: keep only the latest completed entry per assessment slug
  const seen = new Set<string>()
  const results: UserAssessmentScore[] = []

  for (const ua of (data as any[])) {
    const slug = ua.assessment?.slug ?? ''
    if (seen.has(slug)) continue
    seen.add(slug)

    const entry = (ua.metric_entries ?? [])[0]
    results.push({
      id: ua.id,
      completed_at: ua.completed_at,
      assessment_slug: slug,
      assessment_name: asI18n(ua.assessment?.name_i18n).de ?? slug,
      category_slug: ua.assessment?.category?.slug ?? '',
      category_name: asI18n(ua.assessment?.category?.name_i18n).de ?? '',
      metric_unit: ua.assessment?.metric?.unit ?? '',
      value: entry?.value ?? null,
      score: entry?.score ?? null,
    })
  }

  return results
}

// ─── recalculateUserAssessments ───────────────────────────────

export async function recalculateUserAssessments(userId: string): Promise<{ updated: number }> {
  await requireAdmin()

  // 1. Fetch user profile for calculator inputs
  const { data: profileData, error: profileError } = await supabase
    .from('user_profiles')
    .select('gender, weight_in_kg, height_in_cm, birth_date')
    .eq('id', userId)
    .single()

  if (profileError) throw new Error(profileError.message)
  if (!profileData?.gender || !profileData.weight_in_kg || !profileData.height_in_cm || !profileData.birth_date) {
    throw new Error('Benutzerprofil unvollständig (Geschlecht, Gewicht, Größe oder Geburtsdatum fehlt)')
  }

  const profile: AssessmentUserProfile = {
    gender: profileData.gender as 'male' | 'female',
    weight_kg: profileData.weight_in_kg,
    height_cm: profileData.height_in_cm,
    birth_date: profileData.birth_date,
  }

  // 2. Fetch all completed user_assessments with their metric entries
  const { data, error } = await supabase
    .from('user_assessments')
    .select(`
      id, completed_at,
      assessment:assessments ( id, slug, category_id ),
      metric_entries ( id, value )
    `)
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  if (error) throw new Error(error.message)

  // Deduplicate: keep only the latest completed user_assessment per assessment_id
  type EntryMeta = { metricEntryId: string; value: number; categoryId: string; slug: string }
  const latestByAssessmentId = new Map<string, EntryMeta>()

  for (const ua of data) {
    const assessmentId = ua.assessment?.id
    const slug = ua.assessment?.slug as string | undefined
    const categoryId = ua.assessment?.category_id as string | undefined
    const entry = (ua.metric_entries ?? [])[0]
    if (!assessmentId || !slug || !categoryId || !entry || entry.value === null) continue
    if (!latestByAssessmentId.has(assessmentId)) {
      latestByAssessmentId.set(assessmentId, {
        metricEntryId: entry.id,
        value: entry.value,
        categoryId,
        slug,
      })
    }
  }

  // 3. Recalculate scores and collect per category
  let updated = 0
  const scoresByCategory = new Map<string, number[]>()

  for (const item of latestByAssessmentId.values()) {
    const newScore = calculateAssessmentScore(item.slug, item.value, profile)
    if (newScore === null) continue

    const { error: updateError } = await supabase
      .from('metric_entries')
      .update({ score: newScore })
      .eq('id', item.metricEntryId)

    if (updateError) throw new Error(updateError.message)
    updated++

    if (!scoresByCategory.has(item.categoryId)) scoresByCategory.set(item.categoryId, [])
    scoresByCategory.get(item.categoryId)!.push(newScore)
  }

  // 4. Update user_category_levels with new averages
  for (const [categoryId, scores] of scoresByCategory.entries()) {
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    const { error: upsertError } = await supabase
      .from('user_category_levels')
      .upsert(
        { user_id: userId, category_id: categoryId, level_score: avgScore },
        { onConflict: 'user_id,category_id' },
      )
    if (upsertError) throw new Error(upsertError.message)
  }

  return { updated }
}

// ─── fetchSessionDetail ───────────────────────────────────────

export async function fetchSessionDetail(sessionId: string): Promise<SessionDetail | null> {
  await requireAdmin()

  const { data, error } = await supabase
    .from('workout_sessions')
    .select(`
      id, name, status, scheduled_at, started_at, completed_at,
      workout_session_blocks(
        id, order_index,
        block_type:block_types(slug),
        workout_session_block_exercises(
          id, order_index,
          target_sets, target_load_type,
          exercise:exercises(name),
          workout_session_performed_sets(
            set_number, side,
            performed_reps, performed_load_value, performed_rpe,
            performed_duration_seconds, performed_distance_meters
          )
        )
      )
    `)
    .eq('id', sessionId)
    .single()

  if (error && error.code === 'PGRST116') return null
  if (error) throw new Error(error.message)
  if (!data) return null

  const d = data as any

  const blocks: SessionDetailBlock[] = (d.workout_session_blocks ?? [])
    .sort((a: any, b: any) => a.order_index - b.order_index)
    .map((block: any) => ({
      id: block.id,
      order_index: block.order_index,
      block_type_slug: block.block_type?.slug ?? null,
      exercises: (block.workout_session_block_exercises ?? [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((ex: any) => ({
          id: ex.id,
          order_index: ex.order_index,
          exercise_name: ex.exercise?.name ?? '—',
          target_sets: ex.target_sets,
          target_load_type: ex.target_load_type,
          performed_sets: (ex.workout_session_performed_sets ?? [])
            .sort((a: any, b: any) => a.set_number - b.set_number)
            .map((set: any) => ({
              set_number: set.set_number,
              side: set.side,
              performed_reps: set.performed_reps,
              performed_load_value: set.performed_load_value,
              performed_rpe: set.performed_rpe,
              performed_duration_seconds: set.performed_duration_seconds,
              performed_distance_meters: set.performed_distance_meters,
            })),
        })),
    }))

  return {
    id: d.id,
    name: d.name,
    status: d.status,
    scheduled_at: d.scheduled_at,
    started_at: d.started_at,
    completed_at: d.completed_at,
    blocks,
  }
}
