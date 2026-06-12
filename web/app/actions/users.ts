'use server'

import { supabase } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { asI18n } from '@/lib/i18n'

// ─── Auth helpers ─────────────────────────────────────────────

async function requireUser() {
  const cookieStore = await cookies()
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
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
  role: 'user' | 'admin' | 'tester'
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
  role: 'user' | 'admin' | 'tester'
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

  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      id, first_name, last_name, email, birth_date, gender,
      height_in_cm, weight_in_kg, role, has_onboarded,
      preferred_language, timezone, preferred_session_duration,
      preferred_workout_days, load_score, load_profile,
      created_at, last_active_at,
      sport:sports(slug, name_i18n),
      user_environments(environment:environments(slug, name_i18n)),
      user_equipments(equipment:equipments(slug, name_i18n)),
      user_targeted_categories(priority, category:categories(slug, name_i18n)),
      user_category_levels(level_score, category:categories(slug, name_i18n))
    `)
    .eq('id', userId)
    .single()

  if (error && error.code === 'PGRST116') return null
  if (error) throw new Error(error.message)
  if (!data) return null

  const d = data as any

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
    .select('id, name, session_type, status, scheduled_at, completed_at')
    .eq('workout_plan_id', plan.id)
    .order('scheduled_at', { ascending: true })

  if (sessionsError) throw new Error(sessionsError.message)

  const allSessions: WorkoutSessionRow[] = (sessions ?? []).map(s => ({
    id: s.id,
    name: s.name,
    session_type: s.session_type,
    status: s.status,
    scheduled_at: s.scheduled_at,
    completed_at: s.completed_at,
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
  }
}
