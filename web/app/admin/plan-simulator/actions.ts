'use server'

import { supabase } from '@/lib/supabase';

export type SportOption = { id: string; slug: string; name: string }
export type EnvironmentOption = { id: string; slug: string; name: string }
export type EquipmentOption = { id: string; slug: string; name: string; environment_ids: string[] }
export type CategoryOption = { id: string; slug: string; name: string }

export type SimulatorRefData = {
  sports: SportOption[]
  environments: EnvironmentOption[]
  equipments: EquipmentOption[]
  categories: CategoryOption[]
}

function label(name_i18n: unknown, slug: string): string {
  if (name_i18n && typeof name_i18n === 'object') {
    const n = name_i18n as Record<string, string>
    return n.de ?? n.en ?? slug
  }
  return slug
}

export async function getSimulatorRefData(): Promise<SimulatorRefData> {
  const [
    { data: sports },
    { data: environments },
    { data: equipments },
    { data: categories },
  ] = await Promise.all([
    supabase.from('sports').select('id, slug, name_i18n').order('slug'),
    supabase.from('environments').select('id, slug, name_i18n').order('slug'),
    supabase.from('equipments').select('id, slug, name_i18n, environment_equipments(environment_id)').order('slug'),
    supabase.from('categories').select('id, slug, name_i18n').order('slug'),
  ])

  console.log('getSimulatorRefData', sports?.length, environments?.length, equipments?.length, categories?.length)

  return {
    sports: (sports ?? []).map(s => ({ id: s.id, slug: s.slug, name: label(s.name_i18n, s.slug) })),
    environments: (environments ?? []).map(e => ({ id: e.id, slug: e.slug, name: label(e.name_i18n, e.slug) })),
    equipments: (equipments ?? []).map(e => ({
      id: e.id,
      slug: e.slug,
      name: label(e.name_i18n, e.slug),
      environment_ids: (e.environment_equipments as any[]).map((r: any) => r.environment_id),
    })),
    categories: (categories ?? []).map(c => ({ id: c.id, slug: c.slug, name: label(c.name_i18n, c.slug) })),
  }
}

// ─── User Load ────────────────────────────────────────────────

function parseSessionDuration(value: string | null | undefined): number {
  if (!value) return 60
  const n = parseInt(value.replace('min', ''), 10)
  return isNaN(n) ? 60 : n
}

function calculateAge(birthDate: string): number {
  return new Date().getFullYear() - new Date(birthDate).getFullYear()
}

export type LoadedUserData = {
  userData: import('./store').UserData
  displayName: string
}

export async function fetchUserDataForSimulator(
  userId: string,
): Promise<LoadedUserData | null> {
  const [
    { data: profile },
    { data: environments },
    { data: equipments },
    { data: targetedCategories },
    { data: categoryLevels },
  ] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('first_name, last_name, gender, birth_date, height_in_cm, weight_in_kg, preferred_workout_days, preferred_session_duration, weekly_schedule, sport:sports(slug)')
      .eq('id', userId)
      .single(),
    supabase
      .from('user_environments')
      .select('environment_id')
      .eq('user_id', userId),
    supabase
      .from('user_equipments')
      .select('equipment_id')
      .eq('user_id', userId),
    supabase
      .from('user_targeted_categories')
      .select('priority, category:categories(id, slug)')
      .eq('user_id', userId),
    supabase
      .from('user_category_levels')
      .select('category_id, level_score')
      .eq('user_id', userId),
  ])

  if (!profile) return null

  const sessionDuration = parseSessionDuration(
    profile.preferred_session_duration as string | null,
  )

  const userData: import('./store').UserData = {
    gender: (profile.gender as 'male' | 'female') ?? 'male',
    age: profile.birth_date ? calculateAge(profile.birth_date) : 25,
    height_cm: profile.height_in_cm ?? 175,
    weight_kg: profile.weight_in_kg ?? 75,
    sport: (profile.sport as any)?.slug ?? '',
    preferred_workout_days: (profile.preferred_workout_days as number[]) ?? [],
    min_session_duration: sessionDuration,
    max_session_duration: sessionDuration,
    weekly_schedule: (profile.weekly_schedule as any) ?? { sessions: [], notes: null },
    environment_ids: (environments ?? []).map(e => e.environment_id),
    equipment_ids: (equipments ?? []).map(e => e.equipment_id),
    focus_categories: (targetedCategories ?? [])
      .filter(tc => (tc.category as any)?.slug)
      .map(tc => ({
        category_slug: (tc.category as any).slug as string,
        priority: tc.priority,
      })),
    category_levels: (categoryLevels ?? []).map(cl => ({
      category_id: cl.category_id,
      level_score: cl.level_score,
    })),
  }

  const lastName = profile.last_name ? `${profile.last_name[0]}.` : ''
  const displayName = `${profile.first_name ?? ''} ${lastName}`.trim() || userId.slice(0, 8)

  return { userData, displayName }
}
