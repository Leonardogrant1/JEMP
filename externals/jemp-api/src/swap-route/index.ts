// GET /api/swap-alternatives/:blockExerciseId (Spec 2026-10-19 §2).
// DEPLOY-KOPPLUNG: bundelt Worker-Filterlogik (v2/pool, v2/exercise-filter,
// taxonomy) — Änderungen dort erfordern auch einen jemp-api-Deploy.
import type { Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import { buildSwapPool } from './swap-pool'
import { derivePrescription, type CurrentPrescription } from './prescription'
import { makeSportGate, type ExerciseFilterMaps } from '../../../jemp-temporal-worker/src/plan-generation/v2/exercise-filter'
import type { V2Exercise } from '../../../jemp-temporal-worker/src/plan-generation/v2/pool'

// Katalog-Übung inkl. der Zusatzfelder, die der Handler für die Antwort und
// den Level-Check braucht (Spec §2: categories bleibt am Objekt, siehe
// makeExerciseFilter/buildSwapPool — Task 5 prüft row.categories.id direkt).
type CatalogExercise = V2Exercise & { categories: { id: string } | null; thumbnail_storage_path: string | null }

// Fehler-Guard (Review-Fund 1): ungeprüfte Supabase-Fehler liefen bisher via
// `?? []`/`?? null` klaglos durch und maskierten einen Ausfall als leere
// Antwort (200 mit alternatives: []). `must` wirft stattdessen — der
// Handler-weite try/catch fängt, loggt und antwortet 500.
function must<T>(r: { data: T | null; error: { message: string } | null }, what: string): T {
  if (r.error) throw new Error(`${what}: ${r.error.message}`)
  return r.data as T
}

export async function swapAlternativesHandler(req: Request, res: Response): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return }
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) { res.status(401).json({ error: 'Unauthorized' }); return }

  try {
  // 1. Zeile + Kontext (Service-Role: Ownership selbst prüfen!)
  const { data: row, error: rowError } = await supabase
    .from('workout_session_block_exercises')
    .select(`id, exercise_id, assigned_pattern, pattern_emphasis,
      target_sets, target_reps_min, target_reps_max, target_duration_seconds,
      target_distance_meters, target_rest_seconds, target_load_type, target_load_value,
      is_amrap, target_rounds, workout_plan_session_block_exercise_id,
      workout_session_blocks!inner ( block_types ( slug ),
        workout_sessions!inner ( id, user_id, scheduled_at, environment_id ) )`)
    .eq('id', req.params.blockExerciseId)
    .maybeSingle()
  if (rowError) {
    console.error('swap-alternatives: row fetch failed', rowError.message)
    res.status(500).json({ error: 'Internal error' }); return
  }
  const session = (row as any)?.workout_session_blocks?.workout_sessions
  if (!row || session?.user_id !== user.id) { res.status(404).json({ error: 'Not found' }); return }
  const blockTypeSlug = (row as any).workout_session_blocks?.block_types?.slug as string

  // 2. User-Presets + Übungskatalog (Selects wie prepareGenerationV2/prepare-plan-generation)
  const [
    userProfileRes,
    userEquipRes,
    userEnvRes,
    equipEnvRes,
    exerciseRes,
    exerciseEnvRes,
    exerciseEquipRes,
    exerciseBlockRes,
    exerciseRegionRes,
    sportGroupRes,
    equipmentRes,
  ] = await Promise.all([
    supabase.from('user_profiles').select('sport_id, user_category_levels(category_id, level_score)').eq('id', user.id).single(),
    supabase.from('user_equipments').select('equipment_id').eq('user_id', user.id),
    supabase.from('user_environments').select('environment_id').eq('user_id', user.id),
    supabase.from('user_equipment_environments').select('equipment_id, environment_id').eq('user_id', user.id),
    supabase.from('exercises').select('id, slug, name, body_region, dominant_region, strength_pattern, plyo_type, core_type, sprint_type, covered_patterns, laterality, min_level, max_level, intensity_score, measurement_type, exercise_type, movement_type, is_explosive, is_sport_specific, thumbnail_storage_path, categories(id, slug)'),
    supabase.from('exercise_environments').select('exercise_id, environment_id'),
    supabase.from('exercise_equipments').select('exercise_id, equipment_id'),
    supabase.from('exercise_blocks').select('exercise_id, block_types(slug)'),
    supabase.from('exercise_regions').select('exercise_id, region, role'),
    supabase.from('exercise_sport_groups').select('exercise_id, sport_group'),
    supabase.from('equipments').select('id, name_i18n'),
  ])
  const userProfile = must(userProfileRes, 'user_profiles')
  const userEquipRows = must(userEquipRes, 'user_equipments')
  const userEnvRows = must(userEnvRes, 'user_environments')
  const equipEnvRows = must(equipEnvRes, 'user_equipment_environments')
  const exerciseRows = must(exerciseRes, 'exercises')
  const exerciseEnvRows = must(exerciseEnvRes, 'exercise_environments')
  const exerciseEquipRows = must(exerciseEquipRes, 'exercise_equipments')
  const exerciseBlockRows = must(exerciseBlockRes, 'exercise_blocks')
  const exerciseRegionRows = must(exerciseRegionRes, 'exercise_regions')
  const sportGroupRows = must(sportGroupRes, 'exercise_sport_groups')
  const equipmentRows = must(equipmentRes, 'equipments')

  const sportDataRes = userProfile?.sport_id
    ? await supabase.from('sports').select('group_name').eq('id', userProfile.sport_id).single()
    : { data: null as { group_name: string } | null, error: null }
  const sportData = must(sportDataRes, 'sports')
  const sportGroupName = sportData?.group_name ?? undefined

  const categoryLevels = (userProfile?.user_category_levels ?? []) as Array<{ category_id: string; level_score: number }>
  const equipmentIds = (userEquipRows ?? []).map((r: any) => r.equipment_id as string)
  const environmentIds = (userEnvRows ?? []).map((r: any) => r.environment_id as string)

  const equipmentEnvMap = new Map<string, Set<string>>()
  for (const r of equipEnvRows ?? []) {
    if (!equipmentEnvMap.has(r.equipment_id)) equipmentEnvMap.set(r.equipment_id, new Set())
    equipmentEnvMap.get(r.equipment_id)!.add(r.environment_id)
  }

  const envByExercise = new Map<string, Set<string>>()
  for (const r of exerciseEnvRows ?? []) {
    if (!envByExercise.has(r.exercise_id)) envByExercise.set(r.exercise_id, new Set())
    envByExercise.get(r.exercise_id)!.add(r.environment_id)
  }
  const equipByExercise = new Map<string, Set<string>>()
  for (const r of exerciseEquipRows ?? []) {
    if (!r.equipment_id) continue
    if (!equipByExercise.has(r.exercise_id!)) equipByExercise.set(r.exercise_id!, new Set())
    equipByExercise.get(r.exercise_id!)!.add(r.equipment_id)
  }
  const regionsByExercise = new Map<string, Array<{ region: string; role: string }>>()
  for (const r of exerciseRegionRows ?? []) {
    if (!regionsByExercise.has(r.exercise_id)) regionsByExercise.set(r.exercise_id, [])
    regionsByExercise.get(r.exercise_id)!.push({ region: r.region, role: r.role })
  }
  const blocksByExercise = new Map<string, string[]>()
  for (const r of exerciseBlockRows ?? []) {
    const slug = (r.block_types as { slug?: string } | null)?.slug
    if (!slug || !r.exercise_id) continue
    if (!blocksByExercise.has(r.exercise_id)) blocksByExercise.set(r.exercise_id, [])
    blocksByExercise.get(r.exercise_id)!.push(slug)
  }
  const sportGroupsByExercise = new Map<string, Set<string>>()
  for (const r of sportGroupRows ?? []) {
    if (!sportGroupsByExercise.has(r.exercise_id)) sportGroupsByExercise.set(r.exercise_id, new Set())
    sportGroupsByExercise.get(r.exercise_id)!.add(r.sport_group)
  }
  const sportGate = makeSportGate(sportGroupsByExercise, sportGroupName)

  const lang = (req.query.lang as string) || 'de'
  const equipmentNameById = new Map<string, string>()
  for (const r of equipmentRows ?? []) {
    const name = (r.name_i18n as Record<string, string> | null)?.[lang] ?? (r.name_i18n as Record<string, string> | null)?.de
    equipmentNameById.set(r.id, name ?? r.id)
  }

  const filterMaps: ExerciseFilterMaps = {
    envByExercise, equipByExercise,
    userEnvs: new Set(environmentIds),
    userEquip: new Set(equipmentIds),
    equipmentEnvs: equipmentEnvMap,
    levelByCategoryId: new Map(categoryLevels.map((cl) => [cl.category_id, cl.level_score])),
    hasLevelData: categoryLevels.length > 0,
  }

  const toV2 = (r: any): CatalogExercise => ({
    id: r.id, slug: r.slug, name: r.name,
    category_slug: r.categories?.slug ?? '',
    body_region: r.body_region, dominant_region: r.dominant_region,
    strength_pattern: r.strength_pattern, plyo_type: r.plyo_type,
    core_type: r.core_type, sprint_type: r.sprint_type,
    covered_patterns: r.covered_patterns, laterality: r.laterality,
    min_level: r.min_level, max_level: r.max_level,
    intensity_score: r.intensity_score, measurement_type: r.measurement_type,
    exercise_type: r.exercise_type ?? null,
    legacy_block_slugs: blocksByExercise.get(r.id) ?? null,
    movement_type: r.movement_type ?? 'sagittal', is_explosive: r.is_explosive ?? false,
    regions: regionsByExercise.get(r.id) ?? null,
    is_sport_specific: r.is_sport_specific ?? false,
    categories: r.categories ?? null,
    thumbnail_storage_path: r.thumbnail_storage_path ?? null,
    // Paritäts-Fix (Review-Fund 2): wie toV2 im Worker (prepare-v2.ts) — buildSwapPool
    // liest preferred heute nicht, künftige Sortierung könnte aber darauf aufbauen.
    preferred: !!sportGroupName && (sportGroupsByExercise.get(r.id)?.has(sportGroupName) ?? false),
  })

  // Roh-Katalog, NICHT vorgefiltert (anders als prepareGenerationV2): buildSwapPool
  // wendet sportGate/Level-Filter selbst an, damit "locked" (zu schwere Übungen,
  // Level-Check bewusst übersprungen) weiterhin im Kandidatenpool auftaucht.
  const exercises: CatalogExercise[] = (exerciseRows ?? []).map(toV2)
  const currentExercise = exercises.find((e) => e.id === (row as any).exercise_id)
  if (!currentExercise) { res.status(404).json({ error: 'Not found' }); return }

  // 3. Pool + Vorgaben
  const { alternatives, locked } = buildSwapPool({
    exercises, maps: filterMaps, sportGate,
    dayEnvId: session.environment_id ?? null,
    blockTypeSlug, currentExercise,
    assignedPattern: (row as any).assigned_pattern ?? null,
    patternEmphasis: (row as any).pattern_emphasis ?? null,
  })

  const currentPrescription: CurrentPrescription = {
    target_sets: (row as any).target_sets, target_reps_min: (row as any).target_reps_min,
    target_reps_max: (row as any).target_reps_max, target_duration_seconds: (row as any).target_duration_seconds,
    target_distance_meters: (row as any).target_distance_meters, target_rest_seconds: (row as any).target_rest_seconds,
    target_load_type: (row as any).target_load_type, target_load_value: (row as any).target_load_value,
    is_amrap: (row as any).is_amrap, target_rounds: (row as any).target_rounds,
  }

  // 4. future_occurrence_count: Geschwister-Zeilen gleicher Blueprint-Übung
  //    in scheduled/in_progress-Sessions mit scheduled_at >= dieser Session (ohne diese Zeile).
  let futureOccurrenceCount = 0
  const blueprintExerciseId = (row as any).workout_plan_session_block_exercise_id as string | null
  if (blueprintExerciseId && session.scheduled_at) {
    const { count, error: countError } = await supabase
      .from('workout_session_block_exercises')
      .select('id, workout_session_blocks!inner(workout_sessions!inner(scheduled_at, status))', { count: 'exact', head: true })
      .eq('workout_plan_session_block_exercise_id', blueprintExerciseId)
      .neq('id', (row as any).id)
      .gte('workout_session_blocks.workout_sessions.scheduled_at', session.scheduled_at)
      .in('workout_session_blocks.workout_sessions.status', ['scheduled', 'in_progress'])
    if (countError) throw new Error(`future_occurrence_count: ${countError.message}`)
    futureOccurrenceCount = count ?? 0
  }

  // 5. Response-Assembly
  const toExerciseDto = (e: CatalogExercise) => ({
    id: e.id, slug: e.slug, name: e.name,
    thumbnail_storage_path: e.thumbnail_storage_path ?? null,
    equipment: [...(equipByExercise.get(e.id) ?? [])].map((id) => equipmentNameById.get(id) ?? id),
  })
  res.json({
    alternatives: alternatives.map((alt) => ({
      exercise: toExerciseDto(alt as CatalogExercise),
      prescription: derivePrescription(currentPrescription, {
        measurement_type: alt.measurement_type,
        requiresEquipment: (equipByExercise.get(alt.id)?.size ?? 0) > 0,
      }, blockTypeSlug),
    })),
    locked: locked.map((l) => ({ exercise: toExerciseDto(l.exercise as CatalogExercise), unlock_level: l.unlock_level })),
    future_occurrence_count: futureOccurrenceCount,
  })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('swap-alternatives: failed', message)
    res.status(500).json({ error: 'Internal error' })
  }
}
