// externals/jemp-temporal-worker/src/activities/prepare-plan-generation.ts
import { getSupabaseClient } from 'src/utils/supabase'
import { getOpenAIClient } from 'src/utils/openai'
import { prepareGeneration, PrepareResult } from 'src/plan-generation/generate-plan'
import { intensityToPoints, pointsToLoadProfile } from 'src/plan-generation/helpers'

export async function preparePlanGeneration(input: { userId: string }): Promise<PrepareResult> {
  const { userId } = input
  const supabase = getSupabaseClient()
  const openai = getOpenAIClient()

  // ── Fetch user profile ───────────────────────────────────────────────────
  const { data: userProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*, user_category_levels(category_id, level_score)')
    .eq('id', userId)
    .single()
  if (profileError || !userProfile) throw new Error(`User profile not found: ${profileError?.message}`)

  const categoryLevels = userProfile.user_category_levels as Array<{ category_id: string; level_score: number }>

  // ── Fetch equipment ───────────────────────────────────────────────────────
  const { data: userEquipRows } = await supabase
    .from('user_equipments')
    .select('equipment_id')
    .eq('user_id', userId)

  const equipmentIds = (userEquipRows ?? []).map((e: any) => e.equipment_id) as string[]

  // ── Fetch environments ───────────────────────────────────────────────────
  const { data: userEnvRows } = await supabase
    .from('user_environments')
    .select('environment_id, environments(slug)')
    .eq('user_id', userId)

  const environmentIds = (userEnvRows ?? []).map((r: any) => r.environment_id as string)
  const environmentSlugs = (userEnvRows ?? []).map((r: any) => r.environments?.slug as string).filter(Boolean)

  // ── Fetch equipment-environment mapping ──────────────────────────────────
  const { data: equipEnvRows } = await supabase
    .from('user_equipment_environments')
    .select('equipment_id, environment_id')
    .eq('user_id', userId)

  const equipmentEnvMap = new Map<string, string[]>()
  for (const row of equipEnvRows ?? []) {
    const existing = equipmentEnvMap.get(row.equipment_id) ?? []
    equipmentEnvMap.set(row.equipment_id, [...existing, row.environment_id])
  }
  const equipmentEnvironments = Array.from(equipmentEnvMap.entries()).map(([equipment_id, environment_ids]) => ({
    equipment_id,
    environment_ids,
  }))

  // ── Fetch sport + categories ─────────────────────────────────────────────
  const { data: sportData } = await supabase
    .from('sports')
    .select('slug, sport_category_relevance(relevance, categories(slug))')
    .eq('id', userProfile.sport_id)
    .single()

  const sportRequiredCategories = ((sportData?.sport_category_relevance ?? []) as any[])
    .map((r: any) => ({ category: r.categories?.slug, relevance: r.relevance }))
    .sort((a: any, b: any) => b.relevance - a.relevance)

  const { data: targetedCategoriesData } = await supabase
    .from('user_targeted_categories')
    .select('priority, categories(slug)')
    .eq('user_id', userId)

  const userFocusCategories = ((targetedCategoriesData ?? []) as any[])
    .map((t: any) => ({ category: t.categories?.slug, priority: t.priority }))
    .sort((a: any, b: any) => a.priority - b.priority)

  // ── Build plan input ─────────────────────────────────────────────────────
  const weeklySchedule = (userProfile.weekly_schedule as any) ?? { sessions: [], notes: null }
  const loadScore = weeklySchedule.sessions.reduce((sum: number, s: any) => sum + intensityToPoints(s.intensity), 0)
  const loadProfile = pointsToLoadProfile(loadScore)
  const dayEnvironments = (userProfile.day_environments as Array<{ day_of_week: number; environment_id: string }> | null) ?? []

  const durationMap: Record<string, { min: number; max: number }> = {
    '30min': { min: 30, max: 30 },
    '45min': { min: 30, max: 45 },
    '60min': { min: 45, max: 75 },
    '90min': { min: 60, max: 90 },
  }
  const durationPref = durationMap[userProfile.preferred_session_duration ?? '60min'] ?? { min: 45, max: 75 }

  return prepareGeneration(
    {
      sport_slug: sportData?.slug ?? '',
      preferred_workout_days: userProfile.preferred_workout_days ?? [],
      min_session_duration: durationPref.min,
      max_session_duration: durationPref.max,
      weekly_schedule: weeklySchedule,
      load_score: loadScore,
      load_profile: loadProfile,
      environment_ids: environmentIds,
      environment_slugs: environmentSlugs,
      equipment_ids: equipmentIds,
      equipment_environments: equipmentEnvironments,
      category_levels: categoryLevels,
      sport_required_categories: sportRequiredCategories,
      user_focus_categories: userFocusCategories,
      day_environments: dayEnvironments,
    },
    supabase,
    openai,
  )
}
