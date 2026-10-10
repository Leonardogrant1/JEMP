// v2 preparation: builds the deterministic week layout, prebuilds
// speed/mobility/conditioning sessions, and packages per-training-day
// contexts for runSessionV2. IO lives here; the logic modules stay pure.

import type { SupabaseClient } from '@supabase/supabase-js'
import type OpenAI from 'openai'
import { buildWeekLayout, type PillarLevels, type WeekLayout } from '../week-layout'
import type { PrepareResult, SessionBuildInput } from '../generate-plan'
import type { PlanGenerationInput } from '../types'
import { buildBlockPools, preDropEmptyPools, strengthPatternPools, type V2Exercise } from './pool'
import { buildSpeedSession, type PlannedSessionLike } from './build-speed-session'
import { buildMobilitySession, buildConditioningSession, conditioningPoolSlugs } from './build-simple-sessions'
import { pickFinisherFormat, pickSessionFormat, resolveConditioningWeights } from './conditioning-format'
import type { V2SessionContext } from './run-session-v2'

export const MEASURED_SPRINT_MAX_AGE_DAYS = 120
const SPRINT_METRIC_SLUGS = ['10m_sprint_time', '30m_sprint_time', '10m_sprint_flying_time']

/** §6.5: only wizard-written levels activate the v2 path — translated legacy rankings never do. */
export function shouldUseV2(rows: Array<{ set_by_wizard: boolean }>): boolean {
  return rows.some((r) => r.set_by_wizard)
}

export type ExerciseFilterMaps = {
  envByExercise: Map<string, Set<string>>
  equipByExercise: Map<string, Set<string>>
  userEnvs: Set<string>
  userEquip: Set<string>
  /** equipment_id → environment_ids: nur ortsgebundenes Equipment hat Einträge. */
  equipmentEnvs: Map<string, Set<string>>
  levelByCategoryId: Map<string, number>
  hasLevelData: boolean
}

// categories bleibt untypisiert: Supabase inferiert die Join-Spalte als Array,
// zur Laufzeit ist es das Einzel-Objekt der Relation (wie im Legacy-Filter).
type FilterableRow = { id: string; min_level: number; max_level: number; categories?: unknown }

/** Übungs-Filter, optional auf eine Tages-Umgebung verengt (dayEnvId).
 *  Mit null entspricht er dem bisherigen Any-Match über alle User-Umgebungen;
 *  mit Tages-Umgebung zählen nur dort erlaubte Übungen und dort verfügbares
 *  Equipment (equipment_environments). */
export function makeExerciseFilter(maps: ExerciseFilterMaps, dayEnvId: string | null) {
  const equipUsable = (id: string): boolean => {
    if (!maps.userEquip.has(id)) return false
    if (dayEnvId === null) return true
    const envs = maps.equipmentEnvs.get(id)
    return !envs || envs.size === 0 || envs.has(dayEnvId)
  }
  return (row: FilterableRow): boolean => {
    const required = maps.equipByExercise.get(row.id)
    if (required && required.size > 0 && maps.userEquip.size > 0 && ![...required].some(equipUsable)) return false
    const allowed = maps.envByExercise.get(row.id)
    if (allowed && allowed.size > 0) {
      if (dayEnvId !== null) {
        if (!allowed.has(dayEnvId)) return false
      } else if (maps.userEnvs.size > 0 && ![...allowed].some((id) => maps.userEnvs.has(id))) {
        return false
      }
    }
    const categoryId = (row.categories as { id?: string } | null)?.id
    if (maps.hasLevelData && categoryId) {
      const level = maps.levelByCategoryId.get(categoryId)
      if (level === undefined) return false
      if (level < row.min_level || level > row.max_level) return false
    }
    return true
  }
}

export type PlanGenerationInputV2 = PlanGenerationInput & {
  user_id: string
  pillar_levels: PillarLevels
  sprints_covered_by_club: boolean
  sprint_distance: 'under_20m' | '20_40m' | 'over_40m' | null
  day_minutes?: Array<{ day_of_week: number; minutes: number }>
}

/** Validates the preferred_day_durations JSONB from the profile — malformed
 *  input (bad days, non-positive minutes, wrong shape) yields undefined so the
 *  engine falls back to the global duration (phase 3b, review focus 5). */
export function parseDayDurations(raw: unknown): Array<{ day_of_week: number; minutes: number }> | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const parsed: Array<{ day_of_week: number; minutes: number }> = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) return undefined
    const { day_of_week, minutes } = entry as any
    if (!Number.isInteger(day_of_week) || day_of_week < 1 || day_of_week > 7) return undefined
    if (!Number.isInteger(minutes) || minutes <= 0) return undefined
    parsed.push({ day_of_week, minutes })
  }
  return parsed
}

const DAY_NAMES: Record<number, string> = {
  1: 'Montag', 2: 'Dienstag', 3: 'Mittwoch', 4: 'Donnerstag', 5: 'Freitag', 6: 'Samstag', 7: 'Sonntag',
}

export async function prepareGenerationV2(
  input: PlanGenerationInputV2,
  supabase: SupabaseClient,
  _openai: OpenAI,
): Promise<PrepareResult> {
  const notes: string[] = []

  // ── 1. Exercises incl. v2 metadata, filtered for the user ────────────────
  const [{ data: exerciseRows }, { data: exerciseEnvRows }, { data: exerciseEquipRows }, { data: exerciseBlockRows }, { data: environmentRows }] = await Promise.all([
    supabase.from('exercises').select('id, slug, name, body_region, dominant_region, strength_pattern, plyo_type, core_type, sprint_type, covered_patterns, laterality, min_level, max_level, intensity_score, measurement_type, movement_type, is_explosive, categories(id, slug)'),
    supabase.from('exercise_environments').select('exercise_id, environment_id'),
    supabase.from('exercise_equipments').select('exercise_id, equipment_id'),
    supabase.from('exercise_blocks').select('exercise_id, block_types(slug)'),
    supabase.from('environments').select('id, slug'),
  ])
  // exercise_regions (10.10.): betroffene Regionen inkl. primary/secondary —
  // eigener Call, damit der destrukturierte Promise.all-Block lesbar bleibt.
  const { data: exerciseRegionRows } = await supabase.from('exercise_regions').select('exercise_id, region, role')

  // Conditioning-Formate (Spec 2026-10-10 §3): Gewichte je Sportgruppe + Plan-
  // Zähler für die deterministische Format-Rotation. null-Count → 0 (erster Plan).
  const [{ data: weightRows }, { count: planCountRaw }] = await Promise.all([
    supabase.from('sport_conditioning_weights').select('group_name, format, weight'),
    supabase.from('workout_plans').select('id', { count: 'exact', head: true }).eq('user_id', input.user_id),
  ])
  const conditioningWeights = resolveConditioningWeights(weightRows ?? [], input.sport_group_name || undefined)
  const priorPlans = planCountRaw ?? 0
  const sessionFormat = pickSessionFormat(conditioningWeights, priorPlans)
  const finisherFormat = pickFinisherFormat(conditioningWeights)

  const envByExercise = new Map<string, Set<string>>()
  for (const r of exerciseEnvRows ?? []) {
    if (!envByExercise.has(r.exercise_id)) envByExercise.set(r.exercise_id, new Set())
    envByExercise.get(r.exercise_id)!.add(r.environment_id)
  }
  const equipByExercise = new Map<string, Set<string>>()
  for (const r of exerciseEquipRows ?? []) {
    if (!equipByExercise.has(r.exercise_id)) equipByExercise.set(r.exercise_id, new Set())
    equipByExercise.get(r.exercise_id)!.add(r.equipment_id)
  }
  const regionsByExercise = new Map<string, Array<{ region: string; role: string }>>()
  for (const r of exerciseRegionRows ?? []) {
    if (!regionsByExercise.has(r.exercise_id)) regionsByExercise.set(r.exercise_id, [])
    regionsByExercise.get(r.exercise_id)!.push({ region: r.region, role: r.role })
  }
  // Legacy block_type-Tags (warmup/cooldown-Eignung für Mobility, QA 09.10.)
  const blocksByExercise = new Map<string, string[]>()
  for (const r of exerciseBlockRows ?? []) {
    const slug = (r.block_types as { slug?: string } | null)?.slug
    if (!slug) continue
    if (!blocksByExercise.has(r.exercise_id)) blocksByExercise.set(r.exercise_id, [])
    blocksByExercise.get(r.exercise_id)!.push(slug)
  }
  // Lean v2 re-implementation of the legacy equipment/env/level filter —
  // deliberate duplication so the legacy closure stays untouched (plan ruling).
  const filterMaps: ExerciseFilterMaps = {
    envByExercise, equipByExercise,
    userEnvs: new Set(input.environment_ids),
    userEquip: new Set(input.equipment_ids),
    equipmentEnvs: new Map((input.equipment_environments ?? []).map((ee) => [ee.equipment_id, new Set(ee.environment_ids)])),
    levelByCategoryId: new Map<string, number>(input.category_levels.map((cl: { category_id: string; level_score: number }) => [cl.category_id, cl.level_score])),
    hasLevelData: input.category_levels.length > 0,
  }

  const toV2 = (row: any): V2Exercise => ({
    id: row.id, slug: row.slug, name: row.name,
    category_slug: row.categories?.slug ?? '',
    body_region: row.body_region, dominant_region: row.dominant_region,
    strength_pattern: row.strength_pattern, plyo_type: row.plyo_type,
    core_type: row.core_type, sprint_type: row.sprint_type,
    covered_patterns: row.covered_patterns, laterality: row.laterality,
    min_level: row.min_level, max_level: row.max_level,
    intensity_score: row.intensity_score, measurement_type: row.measurement_type,
    legacy_block_slugs: blocksByExercise.get(row.id) ?? null,
    movement_type: row.movement_type ?? 'sagittal', is_explosive: row.is_explosive ?? false,
    regions: regionsByExercise.get(row.id) ?? null,
  })

  const exercises: V2Exercise[] = (exerciseRows ?? []).filter(makeExerciseFilter(filterMaps, null)).map(toV2)

  // Tages-Umgebungen (Lückenschluss 08.10.): hat ein Tag eine feste Umgebung,
  // zählen nur dort erlaubte Übungen und dort verfügbares Equipment.
  const dayEnvById = new Map((input.day_environments ?? []).map((de) => [de.day_of_week, de.environment_id]))
  const byEnvCache = new Map<string, V2Exercise[]>()
  const exercisesForDay = (dayOfWeek: number): V2Exercise[] => {
    const envId = dayEnvById.get(dayOfWeek)
    if (!envId) return exercises
    if (!byEnvCache.has(envId)) {
      byEnvCache.set(envId, (exerciseRows ?? []).filter(makeExerciseFilter(filterMaps, envId)).map(toV2))
    }
    return byEnvCache.get(envId)!
  }

  // Sprint-Env-Fix (09.10.): Sprinten braucht nur freie Fläche — die Speed-
  // Session zieht IMMER aus dem Outdoor-Pool, unabhängig von den gewählten
  // Umgebungen. Level-Gate und ortsgebundenes Equipment filtern weiter (Sleds
  // bleiben im Gym), Bodyweight-Sprints sind für jeden User sichtbar.
  const outdoorEnvId = (environmentRows ?? []).find((e) => e.slug === 'outdoor')?.id ?? null
  const speedExercises: V2Exercise[] = outdoorEnvId
    ? (exerciseRows ?? []).filter(makeExerciseFilter(filterMaps, outdoorEnvId)).map(toV2)
    : exercises
  // Extensiv-Lauf-Anker (Spec §1.1): easy_jog lebt in der sprints-Kategorie und
  // wird wie im Speed-Builder direkt geholt, nicht über den Conditioning-Pool.
  const easyJog = speedExercises.find((e) => e.slug === 'easy_jog') ?? null
  const userHasOutdoor = outdoorEnvId !== null && input.environment_ids.includes(outdoorEnvId)

  // ── 2. Measured sprint value within the aging window (max-velocity gate) ──
  const since = new Date(Date.now() - MEASURED_SPRINT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data: sprintEntries } = await supabase
    .from('metric_entries')
    .select('id, metrics!inner(slug)')
    .eq('user_id', input.user_id)
    .in('metrics.slug', SPRINT_METRIC_SLUGS)
    .gte('created_at', since)
    .limit(1)
  const hasMeasuredSprint = (sprintEntries ?? []).length > 0
  const allowMaxVelocity = hasMeasuredSprint && input.sprint_distance !== null && input.sprint_distance !== 'under_20m'

  // ── 3. Deterministic week layout ─────────────────────────────────────────
  // (Sprint-Env-Fix 09.10.: sprint_friendly_days entfällt — die Speed-Session
  // ist immer outdoor, jeder Tag ist sprinttauglich.)
  const layout: WeekLayout = buildWeekLayout({
    available_days: input.preferred_workout_days,
    weekly_schedule: input.weekly_schedule ?? { sessions: [], notes: null },
    load_profile: input.load_profile ?? 'low',
    pillar_levels: input.pillar_levels,
    sprints_covered_by_club: input.sprints_covered_by_club,
    session_minutes: input.max_session_duration,
    day_minutes: input.day_minutes,
  })
  notes.push(...layout.notes)

  // ── 4. Prebuilt deterministic sessions ───────────────────────────────────
  const prebuiltSessions: PlannedSessionLike[] = []
  let orderIndex = 0
  const trainingDays = layout.placement.days.filter((d) => d.session_type === 'training')

  for (const day of layout.placement.days) {
    const dayExercises = exercisesForDay(day.day_of_week)
    if (day.session_type === 'speed') {
      const r = buildSpeedSession({
        day, exercises: speedExercises,
        levels: { sprints: input.pillar_levels.sprints ?? 0, cod: input.pillar_levels.cod ?? 0 },
        allowMaxVelocity, orderIndex: orderIndex++,
        environmentId: outdoorEnvId ?? undefined,
        sportGroup: input.sport_group_name || undefined,
      })
      if (r) { prebuiltSessions.push(r.session); notes.push(...r.notes) }
      else notes.push(`Speed-Session Tag ${day.day_of_week}: Pool leer — Session entfällt`)
    } else if (day.session_type === 'mobility') {
      const r = buildMobilitySession({ day, exercises: dayExercises, orderIndex: orderIndex++ })
      if (r) prebuiltSessions.push(r.session)
      else notes.push(`Mobility-Session Tag ${day.day_of_week}: Pool zu klein — Session entfällt`)
    } else if (day.session_type === 'conditioning') {
      const dayEnvIsOutdoor = dayEnvById.get(day.day_of_week) === outdoorEnvId && outdoorEnvId !== null
      const r = buildConditioningSession({
        day, exercises: dayExercises, orderIndex: orderIndex++,
        format: sessionFormat, planCount: priorPlans,
        sportGroup: input.sport_group_name || undefined,
        runAnchor: (dayEnvIsOutdoor || userHasOutdoor) ? easyJog : null,
      })
      if (r) { prebuiltSessions.push(r.session); notes.push(...r.notes.map((n) => `Tag ${day.day_of_week}: ${n}`)) }
      else notes.push(`Conditioning-Session Tag ${day.day_of_week}: Pool zu klein — Session entfällt`)
    }
  }

  // ── 5. Per-training-day contexts for runSessionV2 ────────────────────────
  const sessionBuildInputs: SessionBuildInput[] = layout.workouts.map((workout) => {
    const day = trainingDays.find((d) => d.day_of_week === workout.day_of_week)!
    const dayExercises = exercisesForDay(workout.day_of_week)
    const sprintPoolSlugs = dayExercises
      .filter((e) => e.sprint_type !== null && (allowMaxVelocity || e.sprint_type !== 'max_velocity'))
      .map((e) => e.slug)
    const finisherPoolSlugs = conditioningPoolSlugs(dayExercises)
    // Pattern-Anforderungen der Kraftblöcke (Spec 2026-10-10 §1.2) + Pre-Degrade:
    // ein Pattern ohne Pool-Übungen wird aus Block UND Anforderungen entfernt
    // (Note), statt das LLM in eine unerfüllbare Validator-Schleife zu zwingen.
    const patternReqs: NonNullable<V2SessionContext['patternReqs']> = []
    for (const block of workout.blocks) {
      if (!block.patterns || block.patterns.length === 0) continue
      const perPattern = strengthPatternPools(dayExercises, block.patterns)
      const kept = block.patterns.filter((p) => {
        const slugs = (perPattern.get(p.pattern) ?? []).map((e) => e.slug)
        if (slugs.length === 0) {
          notes.push(`Tag ${workout.day_of_week}: Pattern ${p.pattern} ohne Pool-Übungen — Anforderung entfällt`)
          return false
        }
        patternReqs.push({ block_type: block.block_type, pattern: p.pattern, emphasis: p.emphasis, slugs })
        return true
      })
      block.patterns = kept
    }
    const pools = buildBlockPools(dayExercises, workout.blocks)
    const poolRecord: Record<string, string[]> = {}
    for (const [bt, pool] of pools) poolRecord[bt] = pool.map((e) => e.slug)
    notes.push(...preDropEmptyPools(workout, poolRecord).map((n) => `Tag ${workout.day_of_week}: ${n}`))
    const v2: V2SessionContext = {
      workout, day, pools: poolRecord, sprintPool: sprintPoolSlugs,
      conditioningFinisherPool: finisherPoolSlugs,
      conditioningFinisherFormat: finisherFormat, conditioningFinisherOffset: priorPlans,
      patternReqs,
    }
    return {
      spec: { day_of_week: workout.day_of_week, mode_slug: day.dose === 'maintenance' ? 'reduced' : 'full' },
      duration: { min: Math.max(20, day.minutes - 10), max: day.minutes },
      environment_id: null,
      blockPools: [],
      bodyRegions: [],
      warmupExercisesString: '', warmupSlugs: '', warmupCategorySlugs: [],
      cooldownExercisesString: '', cooldownSlugs: '', cooldownCategorySlugs: [],
      v2,
    } as SessionBuildInput
  })

  // ── 6. Summary + result ──────────────────────────────────────────────────
  const weekPlanSummary = layout.placement.days.map((d) => {
    if (d.session_type !== 'training') return `- ${DAY_NAMES[d.day_of_week]}: ${d.session_type}`
    const workout = layout.workouts.find((w) => w.day_of_week === d.day_of_week)
    const blocks = workout?.blocks.map((b) => b.variant ? `${b.block_type}(${b.variant})` : b.block_type).join(', ') ?? ''
    return `- ${DAY_NAMES[d.day_of_week]}: training [${d.heavy_lower ? 'heavy lower' : 'light'}${d.carries_sprint_block ? ', sprint block' : ''}] — ${blocks}`
  }).join('\n')
  if (notes.length > 0) console.log(`prepareGenerationV2 notes:\n  ${notes.join('\n  ')}`)

  const userContext = [
    `sport: ${input.sport_slug}`,
    `load_profile: ${input.load_profile}`,
    input.schedule_notes ? `user_notes: ${input.schedule_notes}` : null,
  ].filter(Boolean).join('\n')

  return {
    weekPlan: { name: 'Athletik-Woche', description: 'Dein Wochenplan nach dem neuen Säulen-System.', sessions: [] },
    sessionBuildInputs,
    weekPlanSummary,
    userContext,
    exerciseSlugToMeasurementType: Object.fromEntries(exercises.map((e) => [e.slug, e.measurement_type ?? 'reps'])),
    exerciseSlugToBodyRegion: Object.fromEntries(exercises.map((e) => [e.slug, e.body_region ?? ''])),
    allExerciseSlugs: exercises.map((e) => e.slug),
    environmentIds: input.environment_ids,
    pathVersion: 'v2',
    prebuiltSessions: prebuiltSessions as any,
  }
}
