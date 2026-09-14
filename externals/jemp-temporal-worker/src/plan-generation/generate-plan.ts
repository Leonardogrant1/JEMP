// externals/jemp-temporal-worker/src/plan-generation/generate-plan.ts
import { SupabaseClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import {
  GENERATE_MAIN_BLOCKS_PROMPT,
  GENERATE_WARMUP_COOLDOWN_PROMPT,
  GENERATE_WEEK_PLAN_PROMPT,
  PreviousSessionSummary,
} from './prompts'
import {
  buildMainSessionSchema,
  buildWarmupCooldownSchema,
  buildWeekPlanSchema,
  mainSessionSchema,
  sessionSchema,
  warmupCooldownSchema,
  weekPlanSchema,
} from './schemas'
import { PlanGenerationInput, SessionModeSlug, WeeklySchedule } from './types'

// ─── Output types ──────────────────────────────────────────────

export type PlannedSession = z.infer<typeof sessionSchema> & { environment_id: string | null }

export type SessionBuildInput = {
  spec: { day_of_week: number; mode_slug: SessionModeSlug }
  duration: { min: number; max: number }
  environment_id: string | null
  hasLoadableEquipment?: boolean
  /** Fokus-Priorität 1 = strength → Chest-Push-Pflicht in Phase C */
  strengthFocus?: boolean
  /** Sport-Pflicht-Regionen — Wochen-Abdeckung wird in Phase C validiert */
  requiredRegions?: string[]
  blockPools: Array<{
    block_type: 'primary' | 'secondary' | 'accessory'
    category_slug: string
    exercisesString: string
    slugs: string
    bodyRegions: string[]
    requiredPatterns?: string[]
    mixedCore?: boolean
    slugIntensities?: Record<string, number>
    patternMaxIntensities?: Record<string, number>
    slugLateralities?: Record<string, string>
    /** Anzahl block-fähiger Übungen im Pool (primary/secondary: getaggte, accessory: alle) */
    capableCount?: number
  }>
  bodyRegions: string[]
  warmupExercisesString: string
  warmupSlugs: string
  warmupCategorySlugs: string[]
  cooldownExercisesString: string
  cooldownSlugs: string
  cooldownCategorySlugs: string[]
}

export type PrepareResult = {
  weekPlan: z.infer<typeof weekPlanSchema>
  sessionBuildInputs: SessionBuildInput[]
  weekPlanSummary: string
  userContext: string
  exerciseSlugToMeasurementType: Record<string, string>
  exerciseSlugToBodyRegion: Record<string, string>
  allExerciseSlugs: string[]
  environmentIds: string[]
}

// ─── Mode determination ───────────────────────────────────────

const MODE_WEIGHTS: Record<SessionModeSlug, number> = {
  recovery: 0, activation: 1, reduced: 2, full: 3,
}

export const SESSION_MODE_DURATION: Record<SessionModeSlug, { min: number; max: number; overrides_user: boolean }> = {
  full: { min: 60, max: 90, overrides_user: false },
  reduced: { min: 45, max: 60, overrides_user: false },
  activation: { min: 20, max: 30, overrides_user: true },
  recovery: { min: 15, max: 25, overrides_user: true },
}

function lighterMode(a: SessionModeSlug, b: SessionModeSlug): SessionModeSlug {
  return MODE_WEIGHTS[a] <= MODE_WEIGHTS[b] ? a : b
}

// ─── Kraftmuster (movement patterns) ──────────────────────────

export const BODY_REGION_TO_PATTERN: Record<string, string> = {
  quad: 'squat',
  hamstring: 'hinge', glute: 'hinge',
  chest: 'push', shoulder: 'push', tricep: 'push',
  upper_back: 'pull', bicep: 'pull',
}

export const PATTERN_TO_REGIONS: Record<string, string[]> = {
  squat: ['quad'],
  hinge: ['hamstring', 'glute'],
  push: ['chest', 'shoulder'],
  pull: ['upper_back'],
}

export const ALL_PATTERNS = ['squat', 'hinge', 'push', 'pull']

export function patternsFromRegions(regions: string[]): string[] {
  return [...new Set(regions.map((r) => BODY_REGION_TO_PATTERN[r]).filter(Boolean))]
}

// Effektive Region einer Übung für Filter und Kraftmuster: full_body-Übungen
// mit gepflegter dominant_region (z.B. power_clean → glute) werden über diese
// sichtbar; ohne dominant_region bleiben sie bewusst allgemein.
export function effectiveRegion(e: { body_region?: string | null; dominant_region?: string | null }): string | null {
  if (e.body_region === 'full_body') return e.dominant_region ?? e.body_region ?? null
  return e.body_region ?? null
}

// Höchste verfügbare Intensität pro Kraftmuster im Pool — Grundlage für den
// pool-relativen Intensitäts-Floor pro PFLICHT-Muster (verhindert z.B. push_up
// (4) im Gym, wo bench_press (8) verfügbar wäre)
export function patternMaxIntensities(pool: Array<{ body_region?: string | null; dominant_region?: string | null; intensity_score?: number | null }>): Record<string, number> {
  const map: Record<string, number> = {}
  for (const e of pool) {
    const pattern = BODY_REGION_TO_PATTERN[effectiveRegion(e) ?? '']
    if (!pattern || e.intensity_score === null || e.intensity_score === undefined) continue
    if ((map[pattern] ?? 0) < e.intensity_score) map[pattern] = e.intensity_score
  }
  return map
}

// Wie viele unterschiedliche Muster ein Strength-Block realistisch tragen kann
// (full: 2–3 Übungen pro Block, reduced: 1 Übung pro Block)
const STRENGTH_PATTERN_CAPACITY: Record<SessionModeSlug, number> = {
  full: 3, reduced: 1, activation: 0, recovery: 0,
}

export function determineSessionModes(
  preferred_workout_days: number[],
  weekly_schedule: WeeklySchedule,
  load_profile: 'low' | 'medium' | 'high',
): Array<{ day_of_week: number; mode_slug: SessionModeSlug }> {
  const gameDays = new Set(
    weekly_schedule.sessions
      .filter((s) => s.type === 'game' || s.type === 'tournament')
      .map((s) => s.day_of_week),
  )

  const sportLoadDays = new Set(
    weekly_schedule.sessions
      .filter((s) => s.type !== 'game' && s.type !== 'tournament' && s.intensity >= 8)
      .map((s) => s.day_of_week),
  )

  function isDayIsolated(day: number): boolean {
    const prev = day === 1 ? 7 : day - 1
    const next = day === 7 ? 1 : day + 1
    return !sportLoadDays.has(prev) && !sportLoadDays.has(next)
  }

  function loadBaseline(day: number): SessionModeSlug {
    if (load_profile === 'low') return 'full'
    if (load_profile === 'medium') return isDayIsolated(day) ? 'full' : 'reduced'
    return 'reduced'
  }

  const result: Array<{ day_of_week: number; mode_slug: SessionModeSlug }> = []

  for (const day of [...preferred_workout_days].sort()) {
    if (gameDays.has(day)) continue

    const constraints: SessionModeSlug[] = [loadBaseline(day)]

    const sportSession = weekly_schedule.sessions.find((s) => s.day_of_week === day)
    if (sportSession) {
      if (sportSession.intensity >= 8) constraints.push('recovery')
      else if (sportSession.intensity >= 7) constraints.push('activation')
    }

    for (const gameDay of gameDays) {
      const diff = gameDay - day
      if (diff === 1) constraints.push('activation')
      else if (diff === -1) constraints.push('recovery')
    }

    result.push({ day_of_week: day, mode_slug: constraints.reduce(lighterMode) })
  }

  return result
}

function targetDuration(
  mode: SessionModeSlug,
  userMin: number,
  userMax: number,
): { min: number; max: number } {
  const r = SESSION_MODE_DURATION[mode]
  if (r.overrides_user) return { min: r.min, max: r.max }
  const max = Math.min(userMax, r.max)
  // Kurze User-Präferenz (< Mode-Minimum) gewinnt — sonst entsteht ein
  // invertiertes Fenster (45-min-Präferenz + full → "Zieldauer 60–45 min")
  const min = Math.min(Math.max(userMin, r.min), max)
  return { min, max }
}

// ─── prepareGeneration ────────────────────────────────────────

export async function prepareGeneration(
  input: PlanGenerationInput,
  supabase: SupabaseClient,
  openai: OpenAI,
): Promise<PrepareResult> {
  const {
    sport_slug,
    preferred_workout_days,
    min_session_duration,
    max_session_duration,
    weekly_schedule = { sessions: [], notes: null },
    load_score = 0,
    load_profile = 'low',
    environment_ids,
    environment_slugs,
    equipment_ids,
    category_levels,
    sport_required_categories,
    user_focus_categories,
    day_environments = [],
    equipment_environments = [],
    sport_group_name = '',
    schedule_notes = null,
    sport_required_regions = [],
  } = input

  const userEnvironmentIds = new Set(environment_ids)
  const userEquipmentSet = new Set(equipment_ids)

  // Map: equipment_id → Set<environment_id> for location-specific equipment
  const equipmentEnvMap = new Map<string, Set<string>>()
  for (const ee of equipment_environments) {
    equipmentEnvMap.set(ee.equipment_id, new Set(ee.environment_ids))
  }
  const levelMap = new Map(category_levels.map((cl) => [cl.category_id, cl.level_score]))
  const hasLevelData = category_levels.length > 0

  // Environment lookup maps
  const envIdToSlugMap = new Map(environment_ids.map((id, i) => [id, environment_slugs[i]]))
  const envSlugToIdMap = new Map(environment_slugs.map((slug, i) => [slug, environment_ids[i]]))
  // User pre-set environments per day
  const dayEnvMap = new Map(day_environments.map((de) => [de.day_of_week, de.environment_id]))

  const t0 = Date.now()
  const elapsed = (since: number) => `${((Date.now() - since) / 1000).toFixed(1)}s`

  // ── 1. Determine session modes ───────────────────────────────

  const sessionSpecs = determineSessionModes(preferred_workout_days, weekly_schedule, load_profile)

  if (sessionSpecs.length === 0) {
    throw new Error('No sessions to generate — preferred_workout_days resulted in zero sessions after mode determination.')
  }

  // ── 2. Fetch exercise data ───────────────────────────────────

  const tDb = Date.now()
  const [
    { data: exerciseEnvRows },
    { data: allEnvRows },
    { data: allEquipmentRows },
    { data: allExercises },
    { data: exerciseSportGroupRows },
    { data: allEquipmentDefs },
  ] = await Promise.all([
    supabase.from('exercise_environments').select('exercise_id, environment_id'),
    supabase.from('environments').select('id, slug'),
    supabase.from('exercise_equipments').select('exercise_id, equipment_id'),
    supabase.from('exercises').select('*, intensity_score, exercise_type, measurement_type, is_sport_specific, categories(id, slug), exercise_blocks(block_types(slug))'),
    (supabase as any).from('exercise_sport_groups').select('exercise_id, sport_group'),
    supabase.from('equipments').select('id, slug'),
  ])
  console.log(`[t=${elapsed(t0)}] DB fetch done (${elapsed(tDb)})`)

  const categorySlugs = sport_required_categories.map((c) => c.category)

  // Kann der User überhaupt in kg zuladen? Ohne wägbares Equipment sind
  // 'kg'-Vorgaben des LLM Unsinn (z.B. "Zusatzlast" beim Hip Thrust ohne
  // Hanteln) — Phase C koerct sie dann auf bodyweight
  const LOADABLE_EQUIPMENT_SLUGS = new Set(['barbell', 'dumbbell', 'kettlebell', 'plate', 'trap_bar', 'weight_belt', 'sled', 'cable_machine', 'landmine', 'medicine_ball'])
  const equipmentSlugById = new Map<string, string>((allEquipmentDefs ?? []).map((r: any) => [r.id, r.slug]))
  const hasLoadableEquipment = equipment_ids.some((id) => LOADABLE_EQUIPMENT_SLUGS.has(equipmentSlugById.get(id) ?? ''))

  const envSlugMap = new Map<string, string>((allEnvRows ?? []).map((r: any) => [r.id, r.slug]))

  const exerciseEnvMap = new Map<string, Set<string>>()
  for (const row of exerciseEnvRows ?? []) {
    if (!exerciseEnvMap.has(row.exercise_id)) exerciseEnvMap.set(row.exercise_id, new Set())
    exerciseEnvMap.get(row.exercise_id!)!.add(row.environment_id)
  }

  const exerciseEquipmentMap = new Map<string, Set<string>>()
  for (const row of allEquipmentRows ?? []) {
    if (!exerciseEquipmentMap.has(row.exercise_id!)) exerciseEquipmentMap.set(row.exercise_id!, new Set())
    exerciseEquipmentMap.get(row.exercise_id!)!.add(row.equipment_id!)
  }

  const exerciseSportGroupMap = new Map<string, Set<string>>()
  for (const row of exerciseSportGroupRows ?? []) {
    if (!exerciseSportGroupMap.has(row.exercise_id)) exerciseSportGroupMap.set(row.exercise_id, new Set())
    exerciseSportGroupMap.get(row.exercise_id)!.add(row.sport_group)
  }

  // ── 3. Exercise filter helpers ───────────────────────────────

  function passesEquipmentAndEnv(exercise: any, sessionEnvId?: string | null): boolean {
    const requiredEquipment = exerciseEquipmentMap.get(exercise.id)
    if (requiredEquipment && requiredEquipment.size > 0 && userEquipmentSet.size > 0) {
      let hasMatch = false
      for (const eqId of requiredEquipment) {
        if (!userEquipmentSet.has(eqId)) continue
        // Location-specific equipment: only available if session env is in its allowed envs
        if (sessionEnvId && equipmentEnvMap.has(eqId)) {
          if (equipmentEnvMap.get(eqId)!.has(sessionEnvId)) { hasMatch = true; break }
        } else {
          // Non-location-specific (or no session env known): always available
          hasMatch = true; break
        }
      }
      if (!hasMatch) return false
    }

    const allowedEnvs = exerciseEnvMap.get(exercise.id)
    if (allowedEnvs && allowedEnvs.size > 0) {
      if (sessionEnvId) {
        // Per-session environment: exact match required
        if (!allowedEnvs.has(sessionEnvId)) return false
      } else if (userEnvironmentIds.size > 0) {
        // Fallback: any of the user's environments
        let hasMatch = false
        for (const envId of allowedEnvs) {
          if (userEnvironmentIds.has(envId)) { hasMatch = true; break }
        }
        if (!hasMatch) return false
      }
    }

    if (hasLevelData && exercise.category_id) {
      const userLevel = levelMap.get(exercise.category_id)
      if (userLevel === undefined) return false
      if (userLevel < exercise.min_level || userLevel > exercise.max_level) return false
    }

    return true
  }

  // Phase B: filter exercises by category + mode intensity/type constraints.
  // exercise_blocks tags are NOT used here — which role a block plays (primary/secondary/accessory)
  // is decided by Phase A, not by a DB tag. Only warmup/cooldown use the explicit block_type tag.
  function filterByCategoryForMode(
    categorySlug: string,
    forMode: SessionModeSlug,
    sessionEnvId?: string | null,
  ): any[] {
    return (allExercises ?? []).filter((exercise) => {
      if (exercise.categories?.slug !== categorySlug) return false
      // Sport-specific skills never appear in main blocks
      if (exercise.is_sport_specific) return false

      const exerciseType = exercise.exercise_type
      const intensityScore = exercise.intensity_score

      switch (forMode) {
        case 'full':
          if (exerciseType !== null && exerciseType !== 'dynamic') return false
          break
        case 'reduced':
          if (exerciseType !== null && exerciseType !== 'dynamic') return false
          if (intensityScore !== null && intensityScore > 7) return false
          break
        case 'activation':
          if (exerciseType !== null && exerciseType === 'breathing') return false
          if (intensityScore !== null && intensityScore > 5) return false
          break
        case 'recovery':
          if (intensityScore !== null && intensityScore > 3) return false
          break
      }

      return passesEquipmentAndEnv(exercise, sessionEnvId)
    })
  }

  // Phase D: filter exercises by warmup/cooldown block_type relation (no intensity/type filter)
  function filterByBlockType(blockType: 'warmup' | 'cooldown', sessionEnvId?: string | null): any[] {
    return (allExercises ?? []).filter((exercise) => {
      const blockSlugs = (exercise.exercise_blocks as any[])?.map((b: any) => b.block_types?.slug) ?? []
      if (!blockSlugs.includes(blockType)) return false
      // Sport-specific exercises: only show for matching sport group
      if (exercise.is_sport_specific) {
        const allowedGroups = exerciseSportGroupMap.get(exercise.id)
        if (!allowedGroups || !allowedGroups.has(sport_group_name)) return false
      }
      return passesEquipmentAndEnv(exercise, sessionEnvId)
    })
  }

  function filterByBodyRegion(exercises: any[], bodyRegions: Set<string>): any[] {
    if (bodyRegions.size === 0) return exercises
    return exercises.filter((e: any) => {
      if (!e.body_region) return true
      if (e.body_region === 'full_body') {
        // Mit dominant_region matcht die Übung nur noch Blöcke, die diese Region
        // (oder explizit full_body) wollen; ohne bleibt sie allgemein (wie bisher)
        return !e.dominant_region || bodyRegions.has('full_body') || bodyRegions.has(e.dominant_region)
      }
      return bodyRegions.has(e.body_region)
    })
  }

  // Primary/Secondary tragen nur Übungen, die dafür getaggt sind — Warmup-/
  // Accessory-Ware im selben Pool (z.B. band_pull_apart in upper_body_plyometrics)
  // zählt nicht als echte Auswahl für den Block.
  function countBlockCapable(pool: any[], blockType: 'primary' | 'secondary' | 'accessory'): number {
    if (blockType === 'accessory') return pool.length
    return pool.filter((e: any) =>
      ((e.exercise_blocks as any[]) ?? []).some((b: any) => b.block_types?.slug === blockType),
    ).length
  }

  // Gemeinsamer Pool-Bau für Hauptblöcke: Category/Mode-Filter → Region-Filter
  // (mit Fallback auf ungefiltert) → Core-Beimischung für Accessory-Blöcke
  function buildMainBlockPool(
    blockType: 'primary' | 'secondary' | 'accessory',
    categorySlug: string,
    bodyRegions: string[],
    modeSlug: SessionModeSlug,
    envId: string | null,
  ): { pool: any[]; mixedCore: boolean } {
    const fullPool = filterByCategoryForMode(categorySlug, modeSlug, envId)
    const regionFiltered = filterByBodyRegion(fullPool, new Set(bodyRegions))
    const pool = regionFiltered.length > 0 ? regionFiltered : fullPool

    // Accessory-Pools regionsvollständig machen: Ziel-Regionen, für die die
    // Block-Category nichts liefert (core/groin/bicep/… leben v.a. in strength),
    // bekommen kategoriefremde Low-Intensity-Übungen beigemischt — sonst wäre
    // der Slot auf mobility-Restbestände beschränkt und Pflicht-Regionen wie
    // Adduktoren blieben unbedienbar.
    let mixedCore = false
    if (blockType === 'accessory') {
      const regionCounts = new Map<string, number>()
      for (const e of pool) {
        const r = effectiveRegion(e)
        if (r) regionCounts.set(r, (regionCounts.get(r) ?? 0) + 1)
      }
      const missingRegions = new Set(bodyRegions.filter((r) => r !== 'full_body' && (regionCounts.get(r) ?? 0) < 3))
      if (missingRegions.size > 0) {
        const inPool = new Set(pool.map((e: any) => e.id))
        const extras = (allExercises ?? []).filter((e: any) =>
          missingRegions.has(e.body_region)
          && !inPool.has(e.id)
          && !e.is_sport_specific
          && (e.exercise_type === null || e.exercise_type === 'dynamic')
          && (e.intensity_score === null || e.intensity_score <= 5)
          && passesEquipmentAndEnv(e, envId),
        )
        if (extras.length > 0) {
          pool.push(...extras)
          mixedCore = true
        }
      }
    }
    return { pool, mixedCore }
  }

  // Intensitäten der Pool-Übungen — Grundlage für die pool-relative
  // Intensitäts-PFLICHT (Prompt) und deren Validierung in Phase C
  function poolSlugIntensities(pool: any[]): Record<string, number> {
    const map: Record<string, number> = {}
    for (const e of pool) {
      if (e.slug && e.intensity_score !== null && e.intensity_score !== undefined) {
        map[e.slug] = e.intensity_score
      }
    }
    return map
  }

  // Lateralität pro Pool-Übung — Kriterium für erlaubte Muster-Dopplung
  // (bilateral + unilateral desselben Musters ergänzen sich)
  function poolSlugLateralities(pool: any[]): Record<string, string> {
    const map: Record<string, string> = {}
    for (const e of pool) {
      if (e.slug && e.laterality) map[e.slug] = e.laterality
    }
    return map
  }

  function exercisesToString(exercises: any[]): string {
    return exercises.map((e) => {
      const blocks = (e.exercise_blocks)
        ?.map((b: any) => b.block_types?.slug)
        .filter(Boolean)
        .join(', ') ?? ''
      const allowedEnvs = exerciseEnvMap.get(e.id)
      const envTag = allowedEnvs && allowedEnvs.size > 0
        ? `, environments: [${[...allowedEnvs].map((id) => envSlugMap.get(id) ?? id).join(', ')}]`
        : ''
      const intensityTag = e.intensity_score !== null && e.intensity_score !== undefined ? `, intensity: ${e.intensity_score}` : ''
      const typeTag = e.exercise_type ? `, type: ${e.exercise_type}` : ''
      const regionTag = e.body_region
        ? `, body_region: ${e.body_region}${e.body_region === 'full_body' && e.dominant_region ? ` (dominant: ${e.dominant_region})` : ''}`
        : ''
      return `[${e.slug}]: ${e.name}, category: ${e.categories?.slug}, blocks: [${blocks}], measurement: ${e.measurement_type ?? 'reps_or_duration'}${intensityTag}${typeTag}${regionTag}${envTag}`
    }).join('\n')
  }

  // ── 4. Phase A: Week planner — AI picks categories per block ──

  // Build per-day preset environments (slug form for the prompt)
  const dayPresetEnvironments = day_environments
    .map((de) => ({ day_of_week: de.day_of_week, environment_slug: envIdToSlugMap.get(de.environment_id) ?? '' }))
    .filter((de) => de.environment_slug !== '')

  const userContext = JSON.stringify({
    sport_slug,
    load_profile,
    load_score,
    ...(weekly_schedule.sessions.length > 0 ? { weekly_schedule } : {}),
    user_environments: environment_slugs,
    ...(dayPresetEnvironments.length > 0 ? { day_preset_environments: dayPresetEnvironments } : {}),
    sport_required_categories,
    user_focus_categories,
    ...(schedule_notes && schedule_notes.trim() !== '' ? { user_notes: schedule_notes.trim() } : {}),
  }, null, 2)

  const MIN_BLOCK_POOL = 3

  // ── Capability-Matrix: was kann dieser User pro Category/Env überhaupt tragen? ──
  // Wird Phase A in den Prompt gegeben, damit sie ausgehungerte Categories
  // (z.B. upper_body_plyometrics ohne Medizinball) gar nicht erst wählt.
  const availabilityEnvs: Array<{ id: string | null; slug: string }> = environment_ids.length > 0
    ? environment_ids.map((id) => ({ id, slug: envIdToSlugMap.get(id) ?? id }))
    : [{ id: null, slug: 'default' }]

  const capableForEnv = (cat: string, envId: string | null, blockType: 'primary' | 'secondary'): number =>
    countBlockCapable(filterByCategoryForMode(cat, 'full', envId), blockType)

  const availabilityRows = categorySlugs.map((cat) => {
    const cells = availabilityEnvs.map(({ id }) => {
      const prim = capableForEnv(cat, id, 'primary')
      const sec = capableForEnv(cat, id, 'secondary')
      return `${prim}/${sec}${prim < MIN_BLOCK_POOL || sec < MIN_BLOCK_POOL ? ' ⚠️' : ''}`
    })
    return `| \`${cat}\` | ${cells.join(' | ')} |`
  })
  const categoryAvailability = [
    `| Category | ${availabilityEnvs.map((e) => `\`${e.slug}\``).join(' | ')} |`,
    `|---|${availabilityEnvs.map(() => '---').join('|')}|`,
    ...availabilityRows,
  ].join('\n')

  console.log(`Phase A availability matrix:\n${categoryAvailability}`)

  const tPhaseA = Date.now()
  console.log(`[t=${elapsed(t0)}] Phase A — calling week planner: ${sessionSpecs.length} sessions, categorySlugs=[${categorySlugs.join(', ')}]`)

  const dynamicWeekPlanSchema = buildWeekPlanSchema(categorySlugs, environment_slugs)

  const weekPlanSystemPrompt = GENERATE_WEEK_PLAN_PROMPT({
    sessions: sessionSpecs.map((s) => ({
      ...s,
      ...targetDuration(s.mode_slug, min_session_duration, max_session_duration),
    })),
    userContext,
    categorySlugs,
    environmentSlugs: environment_slugs,
    dayPresetEnvironments,
    userFocusCategories: user_focus_categories,
    categoryAvailability,
    minBlockPool: MIN_BLOCK_POOL,
    requiredRegions: sport_required_regions,
  })

  const weekPlanCompletion = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [{ role: 'system', content: weekPlanSystemPrompt }],
    reasoning_effort: 'low',
    response_format: zodResponseFormat(dynamicWeekPlanSchema, 'data'),
    max_completion_tokens: 8000,
  })

  const weekPlanChoice = weekPlanCompletion.choices[0]
  console.log(`[t=${elapsed(t0)}] Phase A done (${elapsed(tPhaseA)}) — finish_reason=${weekPlanChoice.finish_reason}, tokens=${weekPlanCompletion.usage?.completion_tokens}`)
  if (weekPlanChoice.finish_reason === 'length') throw new Error('Week plan was cut off.')
  let weekPlan = JSON.parse(weekPlanChoice.message.content!) as z.infer<typeof weekPlanSchema>

  console.log('Phase A — week plan:', JSON.stringify(weekPlan, null, 2))

  // Phase A legt Sessions gelegentlich auf die weekly_schedule-Tage (Team-
  // Training) statt auf die Spec-Tage — ohne Korrektur entstehen Sessions ohne
  // Hauptblöcke, weil Phase B pro Spec-Tag matcht. Deterministisch zurückmappen.
  const remapSessionDays = (plan: z.infer<typeof weekPlanSchema>) => {
    const specDays = sessionSpecs.map((s) => s.day_of_week)
    const missingDays = specDays.filter((d) => !plan.sessions.some((s) => s.day_of_week === d))
    for (const session of plan.sessions) {
      if (specDays.includes(session.day_of_week)) continue
      const target = missingDays.shift()
      if (target === undefined) break
      console.warn(`Phase A day remap: Session Tag ${session.day_of_week} → Tag ${target} (Spec-Tage: ${specDays.join(', ')})`)
      session.day_of_week = target
    }
  }
  remapSessionDays(weekPlan)

  // ── Feasibility-Validierung: hat jeder Hauptblock einen tragfähigen Pool? ──
  // Gleiche Rechnung wie der spätere Pool-Bau (inkl. Region-Filter) — die
  // Matrix oben ist Category-Ebene, das hier fängt auch die Region-Dimension.
  // Mobility als Hauptreiz nur bei bewusster User-Priorisierung (Prio ≤ 2)
  const allowMobilityPrimary = user_focus_categories.some((f) => f.category === 'mobility' && f.priority <= 2)

  const feasibilityIssues = (plan: z.infer<typeof weekPlanSchema>): string[] => {
    const issues: string[] = []
    const plannedDays = new Set(plan.sessions.map((s) => s.day_of_week))
    for (const sp of sessionSpecs) {
      if (!plannedDays.has(sp.day_of_week)) {
        issues.push(`Tag ${sp.day_of_week}: Session fehlt komplett — plane genau eine Session pro Tag aus [${sessionSpecs.map((s) => s.day_of_week).join(', ')}], NICHT für die weekly_schedule-Tage`)
      }
    }
    for (const s of plan.sessions) {
      const spec = sessionSpecs.find((sp) => sp.day_of_week === s.day_of_week)
      if (!spec) continue
      const envSlug = (s as any).environment_slug
      const envId = dayEnvMap.get(s.day_of_week)
        ?? (envSlug ? envSlugToIdMap.get(envSlug) : undefined)
        ?? null
      for (const b of s.blocks) {
        if (b.block_type !== 'primary' && b.block_type !== 'secondary') continue
        if (b.block_type === 'primary' && b.category_slug === 'mobility' && !allowMobilityPrimary) {
          issues.push(`Tag ${s.day_of_week}: primary=\`mobility\` ist für diesen User nicht erlaubt (Mobility nicht als Fokus priorisiert) — stattdessen eine tragfähige Category wiederholen, mit anderen body_regions als ihr erster Einsatz`)
          continue
        }
        const { pool } = buildMainBlockPool(b.block_type, b.category_slug, b.body_regions, spec.mode_slug, envId)
        const count = countBlockCapable(pool, b.block_type)
        if (count < MIN_BLOCK_POOL) {
          issues.push(`Tag ${s.day_of_week}: ${b.block_type}=\`${b.category_slug}\` (env \`${envSlug ?? envIdToSlugMap.get(envId ?? '') ?? 'default'}\`, regions [${b.body_regions.join(', ')}]) hat nur ${count} ${b.block_type}-fähige Übungen — Minimum ist ${MIN_BLOCK_POOL}`)
        }
      }
    }

    // Fokus-Quote: die Prio-1-Category muss primär genug Raum bekommen — ohne
    // harte Quote deckeln no-repeat + Sport-Pflicht sie strukturell auf 1 primary,
    // egal wie der User priorisiert (Prod-Beschwerde "zu wenig Muskelaufbau")
    const prio1 = [...user_focus_categories].sort((a, b) => a.priority - b.priority)[0]?.category
    if (prio1) {
      const resolveEnvId = (s: { day_of_week: number }): string | null => {
        const envSlug = (s as any).environment_slug
        return dayEnvMap.get(s.day_of_week)
          ?? (envSlug ? envSlugToIdMap.get(envSlug) : undefined)
          ?? null
      }
      const mainSessions = plan.sessions.filter((s) => {
        const mode = sessionSpecs.find((sp) => sp.day_of_week === s.day_of_week)?.mode_slug
        return mode === 'full' || mode === 'reduced'
      })
      const eligibleFor = (blockType: 'primary' | 'secondary') => mainSessions.filter((s) => {
        const spec = sessionSpecs.find((sp) => sp.day_of_week === s.day_of_week)!
        const pool = filterByCategoryForMode(prio1, spec.mode_slug, resolveEnvId(s))
        return countBlockCapable(pool, blockType) >= MIN_BLOCK_POOL
      })
      const primaryCovered = mainSessions.filter((s) =>
        s.blocks.some((b) => b.block_type === 'primary' && b.category_slug === prio1),
      ).length
      const mainCovered = mainSessions.filter((s) =>
        s.blocks.some((b) => (b.block_type === 'primary' || b.block_type === 'secondary') && b.category_slug === prio1),
      ).length
      const primaryQuota = Math.min(mainSessions.length >= 3 ? 2 : 1, eligibleFor('primary').length)
      const mainQuota = Math.min(2, Math.max(eligibleFor('primary').length, eligibleFor('secondary').length))
      if (primaryCovered < primaryQuota) {
        issues.push(`FOKUS-QUOTE verletzt: \`${prio1}\` (Priorität 1) ist nur in ${primaryCovered} statt mindestens ${primaryQuota} Session(s) der primary-Block — die primary-Wiederholung von \`${prio1}\` mit deutlich anderen body_regions ist dafür ausdrücklich erlaubt`)
      } else if (mainCovered < mainQuota) {
        issues.push(`FOKUS-QUOTE verletzt: \`${prio1}\` (Priorität 1) kommt nur in ${mainCovered} statt mindestens ${mainQuota} Sessions als primary oder secondary vor — plane \`${prio1}\` in einer weiteren Session als Hauptblock`)
      }
    }

    // Rumpf-PFLICHT: mindestens ein accessory-Block der Woche mit core-Region
    const hasFullSession = plan.sessions.some((s) =>
      sessionSpecs.find((sp) => sp.day_of_week === s.day_of_week)?.mode_slug === 'full')
    if (hasFullSession) {
      const coreCovered = plan.sessions.some((s) =>
        s.blocks.some((b) => b.block_type === 'accessory' && b.body_regions.includes('core')))
      if (!coreCovered) {
        issues.push(`Rumpf-PFLICHT verletzt: Kein accessory-Block der Woche hat \`core\` in den body_regions — plane in einer full-Session einen accessory-Block (category \`mobility\`) mit core in den body_regions`)
      }
    }

    return issues
  }

  // Sport-Pflicht-Regionen: fehlende Regionen lösen KEINEN eigenen Retry aus
  // (der deterministische Patcher unten fixt sie sicher) — sie fahren nur als
  // Zusatzhinweis mit, wenn ohnehin ein Feasibility-Retry läuft
  const regionCoverageIssues = (plan: z.infer<typeof weekPlanSchema>): string[] => {
    if (sport_required_regions.length === 0) return []
    const plannedRegions = new Set<string>(plan.sessions.flatMap((s) => s.blocks.flatMap((b) => b.body_regions as string[])))
    const missing = sport_required_regions.filter((r) => !plannedRegions.has(r))
    return missing.length > 0
      ? [`Sport-Pflicht-Regionen fehlen in allen Blöcken: ${missing.join(', ')} — nimm sie in die body_regions passender Blöcke auf (accessory eignet sich für Ergänzungs-Regionen wie groin oder core)`]
      : []
  }

  const initialIssues = feasibilityIssues(weekPlan)
  if (initialIssues.length > 0) {
    console.warn(`Phase A feasibility: ${initialIssues.length} Verstöße — Retry\n  ${initialIssues.join('\n  ')}`)
    const tRetry = Date.now()
    const retryCompletion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: weekPlanSystemPrompt },
        { role: 'assistant', content: JSON.stringify(weekPlan) },
        {
          role: 'user',
          content: `Dein Wochenplan verletzt die Übungsverfügbarkeits-Regel:\n${[...initialIssues, ...regionCoverageIssues(weekPlan)].map((i) => `- ${i}`).join('\n')}\n\nErsetze die Categories der betroffenen Blöcke durch tragfähige (laut Verfügbarkeitstabelle ≥ ${MIN_BLOCK_POOL} Übungen) und passe die body_regions an. Bilde den ursprünglichen Trainingsreiz über die neue Category ab. Alle anderen Sessions unverändert lassen. Gib den vollständigen korrigierten Wochenplan zurück.`,
        },
      ],
      reasoning_effort: 'low',
      response_format: zodResponseFormat(dynamicWeekPlanSchema, 'data'),
      max_completion_tokens: 8000,
    })
    const retryChoice = retryCompletion.choices[0]
    if (retryChoice.finish_reason !== 'length' && retryChoice.message.content) {
      const retryPlan = JSON.parse(retryChoice.message.content) as z.infer<typeof weekPlanSchema>
      remapSessionDays(retryPlan)
      const retryIssues = feasibilityIssues(retryPlan)
      if (retryIssues.length < initialIssues.length) {
        weekPlan = retryPlan
        console.log(`[t=${elapsed(t0)}] Phase A feasibility retry übernommen (${elapsed(tRetry)}) — Verstöße ${initialIssues.length} → ${retryIssues.length}`)
        if (retryIssues.length > 0) console.warn(`  verbleibend (Category-Fallback greift später):\n  ${retryIssues.join('\n  ')}`)
      } else {
        console.warn(`Phase A feasibility retry verworfen (${retryIssues.length} Verstöße) — Category-Fallback greift später`)
      }
    } else {
      console.warn('Phase A feasibility retry unbrauchbar (cut off) — Category-Fallback greift später')
    }
  }

  const DAY_NAMES: Record<number, string> = {
    1: 'Montag', 2: 'Dienstag', 3: 'Mittwoch', 4: 'Donnerstag',
    5: 'Freitag', 6: 'Samstag', 7: 'Sonntag',
  }

  // Validate Phase A: warn about duplicate primary categories
  const primaryCategories = weekPlan.sessions
    .flatMap((s) => s.blocks.filter((b) => b.block_type === 'primary').map((b) => ({ day: s.day_of_week, category: b.category_slug })))
  const primaryCategoryCounts = new Map<string, number[]>()
  for (const { day, category } of primaryCategories) {
    if (!primaryCategoryCounts.has(category)) primaryCategoryCounts.set(category, [])
    primaryCategoryCounts.get(category)!.push(day)
  }
  const prio1FocusCategory = [...user_focus_categories].sort((a, b) => a.priority - b.priority)[0]?.category
  for (const [category, days] of primaryCategoryCounts) {
    if (days.length > 1 && category === prio1FocusCategory) {
      // Fokus-Quote: die Prio-1-Category wiederholt primary bewusst (andere body_regions)
      console.log(`Fokus-Quote: primary "${category}" bewusst mehrfach geplant: ${days.map((d) => DAY_NAMES[d] ?? `Tag ${d}`).join(', ')}`)
    } else if (days.length > 1) {
      console.warn(`⚠️  Phase A violation: primary category "${category}" used on multiple days: ${days.map((d) => DAY_NAMES[d] ?? `Tag ${d}`).join(', ')} — sessions will feel similar`)
    }
  }

  // ── Kraftmuster-Bilanz: alle 4 Muster müssen über die Strength-Blöcke der
  // Woche abgedeckt sein. Fehlende Muster werden deterministisch in Blöcke mit
  // freier Kapazität gepatcht statt auf Prompt-Treue zu hoffen.
  const strengthBlocks = weekPlan.sessions.flatMap((s) => {
    const spec = sessionSpecs.find((sp) => sp.day_of_week === s.day_of_week)
    if (!spec) return []
    return s.blocks
      .filter((b) => b.category_slug === 'strength' && (b.block_type === 'primary' || b.block_type === 'secondary'))
      .map((b) => ({ block: b, day: s.day_of_week, mode: spec.mode_slug, capacity: STRENGTH_PATTERN_CAPACITY[spec.mode_slug] }))
  })

  if (strengthBlocks.length > 0) {
    const coveredPatterns = new Set(strengthBlocks.flatMap((sb) => patternsFromRegions(sb.block.body_regions)))
    const missingPatterns = ALL_PATTERNS.filter((p) => !coveredPatterns.has(p))

    for (const pattern of missingPatterns) {
      // Block mit den wenigsten Mustern und freier Kapazität — primary bevorzugt
      const candidates = strengthBlocks
        .map((sb) => ({ ...sb, patternCount: patternsFromRegions(sb.block.body_regions).length }))
        .filter((sb) => sb.patternCount < sb.capacity)
        .sort((a, b) => a.patternCount - b.patternCount || (a.block.block_type === 'primary' ? -1 : 1))

      const target = candidates[0]
      if (!target) {
        console.warn(`⚠️  Pattern balance: "${pattern}" fehlt und kein Strength-Block hat freie Kapazität — diese Woche nicht abdeckbar`)
        continue
      }
      target.block.body_regions.push(...PATTERN_TO_REGIONS[pattern].filter((r) => !target.block.body_regions.includes(r as any)) as any)
      console.log(`Pattern balance: "${pattern}" fehlte — gepatcht in day ${target.day} ${target.block.block_type}/strength (regions += ${PATTERN_TO_REGIONS[pattern].join(', ')})`)
    }
  }

  // Sport-Pflicht-Regionen: fehlende Regionen deterministisch in accessory-
  // Blöcke patchen (Backstop nach dem Feasibility-Retry). Der Accessory-Pool
  // wird für diese Regionen kategoriefremd ergänzt (siehe buildMainBlockPool),
  // die Wochen-Abdeckung validiert Phase C in der letzten Session.
  if (sport_required_regions.length > 0) {
    const plannedRegions = new Set<string>(weekPlan.sessions.flatMap((s) => s.blocks.flatMap((b) => b.body_regions as string[])))
    const accessoryBlocks = weekPlan.sessions
      .flatMap((s) => s.blocks.filter((b) => b.block_type === 'accessory').map((b) => ({ day: s.day_of_week, block: b })))
      .sort((a, b) => a.block.body_regions.length - b.block.body_regions.length)
    for (const region of sport_required_regions) {
      if (plannedRegions.has(region)) continue
      const target = accessoryBlocks[0]
      if (!target) {
        console.warn(`⚠️  Sport-Pflicht-Region "${region}" fehlt und kein accessory-Block vorhanden — nicht patchbar`)
        continue
      }
      target.block.body_regions.push(region as any)
      console.log(`Sport-Pflicht-Region "${region}" fehlte — gepatcht in day ${target.day} accessory (regions += ${region})`)
    }
  }

  // Erst NACH Pool Opt + Category-Fallback gebaut — die können Block-Kategorien
  // noch ändern, und die Summary muss für Phase C zum finalen Stand passen
  const buildWeekPlanSummary = () => weekPlan.sessions.map((s) => {
    const blocksText = s.blocks.map((b) => {
      const regions = b.body_regions.length > 0 ? `[${b.body_regions.join(',')}]` : ''
      return `${b.block_type}=${b.category_slug}${regions}`
    }).join(', ')
    const spec = sessionSpecs.find((sp) => sp.day_of_week === s.day_of_week)
    return `- ${DAY_NAMES[s.day_of_week] ?? `Tag ${s.day_of_week}`} [${spec?.mode_slug ?? '?'}]: ${blocksText || 'keine Hauptblöcke'}`
  }).join('\n')

  // ── 5. Phase B: Code builds all exercise pools per session ───

  type BlockPool = {
    block_type: 'primary' | 'secondary' | 'accessory'
    category_slug: string
    exercisesString: string
    slugs: string
    bodyRegions: string[]
    requiredPatterns?: string[]
    mixedCore?: boolean
    slugIntensities?: Record<string, number>
    patternMaxIntensities?: Record<string, number>
    slugLateralities?: Record<string, string>
    capableCount?: number
  }

  const sessionBuildInputs: SessionBuildInput[] = sessionSpecs.map((spec) => {
    const duration = targetDuration(spec.mode_slug, min_session_duration, max_session_duration)
    const weekPlanSession = weekPlan.sessions.find((s) => s.day_of_week === spec.day_of_week)
    const allowedBlockTypes: Record<SessionModeSlug, Set<string>> = {
      full: new Set(['primary', 'secondary', 'accessory']),
      reduced: new Set(['primary', 'secondary', 'accessory']),
      activation: new Set(['accessory']),
      recovery: new Set(),
    }
    const plannedBlocks = (weekPlanSession?.blocks ?? []).filter((b) => {
      if (!allowedBlockTypes[spec.mode_slug].has(b.block_type)) {
        console.warn(`Phase A violation: day ${spec.day_of_week} [${spec.mode_slug}] has disallowed block_type="${b.block_type}" — skipping`)
        return false
      }
      return true
    })
    // Session-Regionen = Union der Block-Regionen (für Warmup/Cooldown-Filterung)
    const sessionBodyRegions = new Set((weekPlanSession?.blocks ?? []).flatMap((b) => b.body_regions))

    // Resolve session environment: user preset → Phase A LLM choice → null
    const sessionEnvSlug = (weekPlanSession as any)?.environment_slug
    const sessionEnvId = dayEnvMap.get(spec.day_of_week)
      ?? (sessionEnvSlug ? envSlugToIdMap.get(sessionEnvSlug) : undefined)
      ?? null

    console.log(`Phase B day ${spec.day_of_week}: environment=${sessionEnvSlug ?? 'none'} (id=${sessionEnvId ?? 'null'})`)

    const blockPools: BlockPool[] = plannedBlocks.map((block) => {
      const blockRegions = new Set<string>(block.body_regions)
      const { pool, mixedCore } = buildMainBlockPool(block.block_type, block.category_slug, block.body_regions, spec.mode_slug, sessionEnvId)
      if (mixedCore) {
        console.log(`Phase B day ${spec.day_of_week} accessory: Core-Übungen beigemischt`)
      }

      if (pool.length === 0) {
        console.warn(`Phase B day ${spec.day_of_week} [${spec.mode_slug}] ${block.block_type}/${block.category_slug}: EMPTY pool — no exercises for this category`)
      } else {
        console.log(`Phase B day ${spec.day_of_week} [${spec.mode_slug}] ${block.block_type}/${block.category_slug}: ${pool.length} exercises (${countBlockCapable(pool, block.block_type)} ${block.block_type}-fähig, regions: ${[...blockRegions].join(',') || 'alle'})`)
      }

      // Strength: geforderte Muster aus den Block-Regionen — aber nur, was der Pool
      // hergibt. Accessory-Strength (ARM-FOKUS-Isolationsblock) trägt keine Muster-Pflicht.
      let requiredPatterns: string[] | undefined
      if (block.category_slug === 'strength' && block.block_type !== 'accessory') {
        const wanted = patternsFromRegions(block.body_regions)
        const poolPatterns = new Set(pool.map((e: any) => BODY_REGION_TO_PATTERN[effectiveRegion(e) ?? '']).filter(Boolean))
        requiredPatterns = wanted.filter((p) => poolPatterns.has(p))
        const unsupported = wanted.filter((p) => !poolPatterns.has(p))
        if (unsupported.length > 0) {
          console.warn(`Phase B day ${spec.day_of_week} ${block.block_type}/strength: Muster ohne Pool-Übungen entfernt: ${unsupported.join(', ')}`)
        }
      }

      return {
        block_type: block.block_type,
        category_slug: block.category_slug,
        exercisesString: exercisesToString(pool),
        slugs: pool.map((e: any) => e.slug).join(', '),
        bodyRegions: block.body_regions,
        requiredPatterns,
        mixedCore,
        slugIntensities: poolSlugIntensities(pool),
        patternMaxIntensities: patternMaxIntensities(pool),
        slugLateralities: poolSlugLateralities(pool),
        capableCount: countBlockCapable(pool, block.block_type),
      }
    })

    const allWarmupExercises = filterByBlockType('warmup', sessionEnvId)
    const allCooldownExercises = filterByBlockType('cooldown', sessionEnvId)

    const warmupPool = (() => {
      const filtered = filterByBodyRegion(allWarmupExercises, sessionBodyRegions)
      return filtered.length > 0 ? filtered : allWarmupExercises
    })()
    const cooldownPool = (() => {
      const filtered = filterByBodyRegion(allCooldownExercises, sessionBodyRegions)
      return filtered.length > 0 ? filtered : allCooldownExercises
    })()

    console.log(`Phase B day ${spec.day_of_week}: bodyRegions=[${[...sessionBodyRegions].join(',')}], warmup=${warmupPool.length}, cooldown=${cooldownPool.length}`)

    const uniqueSlugs = (pool: any[]) => [...new Set(pool.map((e: any) => e.categories?.slug).filter(Boolean))]

    return {
      spec,
      duration,
      environment_id: sessionEnvId,
      hasLoadableEquipment,
      strengthFocus: prio1FocusCategory === 'strength',
      requiredRegions: sport_required_regions,
      blockPools,
      bodyRegions: [...sessionBodyRegions],
      warmupExercisesString: exercisesToString(warmupPool),
      warmupSlugs: warmupPool.map((e: any) => e.slug).join(', '),
      warmupCategorySlugs: uniqueSlugs(warmupPool),
      cooldownExercisesString: exercisesToString(cooldownPool),
      cooldownSlugs: cooldownPool.map((e: any) => e.slug).join(', '),
      cooldownCategorySlugs: uniqueSlugs(cooldownPool),
    }
  })

  // ── Pool Optimization: switch env if any block pool is too small ────────────

  // Wie viele Übungen können diesen Block wirklich tragen? (primary/secondary:
  // nur entsprechend getaggte, accessory: alle)
  const blockCapableCount = (si: SessionBuildInput, p: BlockPool, envId: string | null): number =>
    countBlockCapable(
      buildMainBlockPool(p.block_type, p.category_slug, p.bodyRegions, si.spec.mode_slug, envId).pool,
      p.block_type,
    )

  for (const si of sessionBuildInputs) {
    // Never override user-preset environments
    if (dayEnvMap.has(si.spec.day_of_week)) continue

    const tooSmall = si.blockPools.filter(
      (p) => blockCapableCount(si, p, si.environment_id) < MIN_BLOCK_POOL,
    )
    if (tooSmall.length === 0) continue

    const tooSmallDesc = tooSmall
      .map((p) => `${p.block_type}/${p.category_slug}=${blockCapableCount(si, p, si.environment_id)}`)
      .join(', ')
    console.log(`Pool Opt day ${si.spec.day_of_week}: small pools: ${tooSmallDesc} (threshold=${MIN_BLOCK_POOL})`)

    const scoreEnv = (envId: string | null): number =>
      si.blockPools.reduce((sum, block) => sum + blockCapableCount(si, block, envId), 0)

    const currentScore = scoreEnv(si.environment_id)
    let bestEnvId = si.environment_id
    let bestScore = currentScore

    for (const envId of environment_ids) {
      if (envId === si.environment_id) continue
      const score = scoreEnv(envId)
      if (score > bestScore) { bestScore = score; bestEnvId = envId }
    }

    if (bestEnvId === si.environment_id) {
      console.log(`  Pool Opt day ${si.spec.day_of_week}: no better environment found`)
      continue
    }

    const fromSlug = si.environment_id ? (envIdToSlugMap.get(si.environment_id) ?? si.environment_id) : 'none'
    const toSlug = bestEnvId ? (envIdToSlugMap.get(bestEnvId) ?? bestEnvId) : 'none'
    console.log(`  Pool Opt day ${si.spec.day_of_week}: switching env ${fromSlug} → ${toSlug} (score: ${currentScore} → ${bestScore})`)
    si.environment_id = bestEnvId

    // Recompute block pools with new environment (gleiche Region-Filterung + Core-Beimischung wie initial)
    for (const block of si.blockPools) {
      const { pool, mixedCore } = buildMainBlockPool(block.block_type, block.category_slug, block.bodyRegions, si.spec.mode_slug, bestEnvId)
      block.mixedCore = mixedCore || block.mixedCore
      block.exercisesString = exercisesToString(pool)
      block.slugs = pool.map((e: any) => e.slug).join(', ')
      block.slugIntensities = poolSlugIntensities(pool)
      block.patternMaxIntensities = patternMaxIntensities(pool)
      block.slugLateralities = poolSlugLateralities(pool)
      block.capableCount = countBlockCapable(pool, block.block_type)
      if (block.category_slug === 'strength' && block.block_type !== 'accessory') {
        const wanted = patternsFromRegions(block.bodyRegions)
        const poolPatterns = new Set(pool.map((e: any) => BODY_REGION_TO_PATTERN[effectiveRegion(e) ?? '']).filter(Boolean))
        block.requiredPatterns = wanted.filter((p) => poolPatterns.has(p))
      }
      console.log(`     ${block.block_type}/${block.category_slug}: → ${pool.length} exercises (${block.capableCount} ${block.block_type}-fähig)`)
    }

    // Recompute warmup/cooldown pools
    const sessionBodyRegions = new Set(si.bodyRegions)
    const allWarmupOpt = filterByBlockType('warmup', bestEnvId)
    const allCooldownOpt = filterByBlockType('cooldown', bestEnvId)
    const warmupPoolOpt = (() => { const f = filterByBodyRegion(allWarmupOpt, sessionBodyRegions); return f.length > 0 ? f : allWarmupOpt })()
    const cooldownPoolOpt = (() => { const f = filterByBodyRegion(allCooldownOpt, sessionBodyRegions); return f.length > 0 ? f : allCooldownOpt })()
    const uniqueSlugsOpt = (pool: any[]) => [...new Set(pool.map((e: any) => e.categories?.slug).filter(Boolean))]
    si.warmupExercisesString = exercisesToString(warmupPoolOpt)
    si.warmupSlugs = warmupPoolOpt.map((e: any) => e.slug).join(', ')
    si.warmupCategorySlugs = uniqueSlugsOpt(warmupPoolOpt)
    si.cooldownExercisesString = exercisesToString(cooldownPoolOpt)
    si.cooldownSlugs = cooldownPoolOpt.map((e: any) => e.slug).join(', ')
    si.cooldownCategorySlugs = uniqueSlugsOpt(cooldownPoolOpt)
  }

  // ── Category-Fallback: Hauptblöcke ohne tragfähigen Pool umwidmen ──────────
  // Der Env-Switch oben hilft nicht, wenn das fehlende Equipment in keinem
  // Environment des Users existiert (z.B. upper_body_plyometrics ohne Medizinball
  // → nur clap_push_up ist primary-fähig). Läuft bewusst auch für Tage mit
  // User-preset Environment — getauscht wird die Kategorie, nie das Environment.
  const fallbackCandidates = [
    ...user_focus_categories.map((c) => c.category),
    ...sport_required_categories.map((c) => c.category),
  ].filter((c, i, arr) => !!c && c !== 'mobility' && arr.indexOf(c) === i)

  for (const si of sessionBuildInputs) {
    for (const block of si.blockPools) {
      if (block.block_type === 'accessory') continue
      const currentCount = blockCapableCount(si, block, si.environment_id)
      if (currentCount >= MIN_BLOCK_POOL) continue

      const usedCategories = new Set(si.blockPools.filter((p) => p !== block).map((p) => p.category_slug))
      let best: { category: string; pool: any[]; count: number } | null = null
      for (const candidate of fallbackCandidates) {
        if (candidate === block.category_slug || usedCategories.has(candidate)) continue
        const fullPool = filterByCategoryForMode(candidate, si.spec.mode_slug, si.environment_id)
        // Strikt auf die Block-Regionen, ohne Fallback auf ungefiltert — sonst
        // landet z.B. Lower-Plyo in einem Oberkörper-Block
        const pool = filterByBodyRegion(fullPool, new Set(block.bodyRegions))
        const count = countBlockCapable(pool, block.block_type)
        // Kandidaten sind nach Priorität sortiert: der erste tragfähige gewinnt
        if (count >= MIN_BLOCK_POOL) { best = { category: candidate, pool, count }; break }
        if (count > (best?.count ?? 0)) best = { category: candidate, pool, count }
      }

      if (!best || best.count <= currentCount) {
        console.warn(`⚠️  Category fallback day ${si.spec.day_of_week} ${block.block_type}/${block.category_slug}: nur ${currentCount} ${block.block_type}-fähige Übungen und keine tragfähigere Kategorie — Block bleibt dünn`)
        continue
      }

      console.log(`Category fallback day ${si.spec.day_of_week} ${block.block_type}: ${block.category_slug} (${currentCount} ${block.block_type}-fähig) → ${best.category} (${best.count})`)

      // weekPlan mitziehen, damit die Session-Summary für Phase C den finalen Stand zeigt
      const weekPlanBlock = weekPlan.sessions
        .find((s) => s.day_of_week === si.spec.day_of_week)?.blocks
        .find((b) => b.block_type === block.block_type && b.category_slug === block.category_slug)
      if (weekPlanBlock) weekPlanBlock.category_slug = best.category as any

      block.category_slug = best.category
      block.exercisesString = exercisesToString(best.pool)
      block.slugs = best.pool.map((e: any) => e.slug).join(', ')
      block.slugIntensities = poolSlugIntensities(best.pool)
      block.patternMaxIntensities = patternMaxIntensities(best.pool)
      block.slugLateralities = poolSlugLateralities(best.pool)
      block.capableCount = best.count
      if (best.category === 'strength') {
        const wanted = patternsFromRegions(block.bodyRegions)
        const poolPatterns = new Set(best.pool.map((e: any) => BODY_REGION_TO_PATTERN[effectiveRegion(e) ?? '']).filter(Boolean))
        block.requiredPatterns = wanted.filter((p) => poolPatterns.has(p))
      } else {
        block.requiredPatterns = undefined
      }
    }
  }

  const weekPlanSummary = buildWeekPlanSummary()

  // Build compact measurement type + body region lookups
  const exerciseSlugToMeasurementType: Record<string, string> = {}
  const exerciseSlugToBodyRegion: Record<string, string> = {}
  for (const e of allExercises ?? []) {
    if (e.slug && e.measurement_type) {
      exerciseSlugToMeasurementType[e.slug] = e.measurement_type
    }
    const region = effectiveRegion(e)
    if (e.slug && region) {
      exerciseSlugToBodyRegion[e.slug] = region
    }
  }

  const allExerciseSlugs = (allExercises ?? []).map((e: any) => e.slug).filter(Boolean)

  return {
    weekPlan,
    sessionBuildInputs,
    weekPlanSummary,
    userContext,
    exerciseSlugToMeasurementType,
    exerciseSlugToBodyRegion,
    allExerciseSlugs,
    environmentIds: environment_ids,
  }
}

// Prüft Strength-Muster-Abdeckung, doppelte Übungen und die pool-relative
// Intensitäts-PFLICHT (Hauptreiz muss das obere Ende des Pools nutzen)
export function findSessionViolations(
  session: { blocks: Array<{ block_type: string; exercises: Array<{ exercise_slug: string }> }> },
  blockPools: SessionBuildInput['blockPools'],
  modeSlug: SessionModeSlug,
  exerciseSlugToBodyRegion: Record<string, string>,
  previousPushRegions?: string[],
  strengthFocus?: boolean,
  /** Noch offene Sport-Pflicht-Regionen dieser Woche */
  remainingRequiredRegions?: string[],
  /** Letzte Session der Woche → offene Regionen werden über ALLE Pools erzwungen, nicht nur in Blöcken mit passender Ziel-Region */
  isLastSession?: boolean,
): string[] {
  const violations: string[] = []
  for (const block of session.blocks) {
    const seen = new Set<string>()
    for (const e of block.exercises) {
      if (seen.has(e.exercise_slug)) {
        violations.push(`Block "${block.block_type}": Übung "${e.exercise_slug}" kommt doppelt vor — jede Übung nur einmal pro Block`)
      }
      seen.add(e.exercise_slug)
    }

    const pool = blockPools.find((p) => p.block_type === block.block_type)

    // Mindest-Volumen: full-Hauptblöcke mit nur 1 Übung fühlen sich leer an
    // (Prod-Beschwerde) — Verstoß nur, wenn der Pool tatsächlich mehr hergibt
    if (modeSlug === 'full' && (block.block_type === 'primary' || block.block_type === 'secondary')
      && block.exercises.length < 2 && (pool?.capableCount ?? 0) >= 2) {
      violations.push(`Block "${block.block_type}": nur ${block.exercises.length} Übung — full-Sessions brauchen mindestens 2 Übungen in primary/secondary (der Pool bietet ${pool!.capableCount} geeignete)`)
    }

    // Intensitäts-PFLICHT nur für volle Sessions — reduced/activation sind
    // bewusst gedrosselt, accessory hat eine Low-Intensity-Rolle
    if (modeSlug === 'full' && (block.block_type === 'primary' || block.block_type === 'secondary')) {
      const intensities = pool?.slugIntensities ?? {}
      const values = Object.values(intensities)
      const poolMax = values.length > 0 ? Math.max(...values) : 0
      if (poolMax > 0) {
        const floor = block.block_type === 'primary' ? poolMax - 1 : poolMax - 2
        const chosen = block.exercises
          .map((e) => intensities[e.exercise_slug])
          .filter((v): v is number => v !== undefined)
        const chosenMax = chosen.length > 0 ? Math.max(...chosen) : 0
        if (chosenMax < floor) {
          const topSlugs = Object.entries(intensities)
            .filter(([, v]) => v >= floor)
            .map(([slug, v]) => `${slug} (${v})`)
            .join(', ')
          violations.push(`Block "${block.block_type}": Intensität zu niedrig — höchste gewählte intensity ist ${chosenMax}, der Pool bietet ${poolMax}. Wähle mindestens eine Übung mit intensity ≥ ${floor}, z.B.: ${topSlugs}`)
        }
      }
    }

    if (!pool?.requiredPatterns?.length) continue
    const covered = new Set(patternsFromRegions(
      block.exercises.map((e) => exerciseSlugToBodyRegion[e.exercise_slug]).filter(Boolean),
    ))
    const missing = pool.requiredPatterns.filter((p) => !covered.has(p))
    if (missing.length > 0) {
      violations.push(`Block "${block.block_type}": Muster fehlen: ${missing.join(', ')} — gewählt waren: ${block.exercises.map((e) => e.exercise_slug).join(', ')}`)
    }

    // Intensitäts-Floor pro PFLICHT-Muster (nur volle Sessions): jedes Muster
    // muss nahe am Maximum liegen, das der Pool FÜR DIESES MUSTER hergibt —
    // sonst erfüllt eine schwere Squat-Übung den Block-Floor und die übrigen
    // Slots bleiben weich (push_up (4) trotz verfügbarer bench_press (8))
    if (modeSlug === 'full' && (block.block_type === 'primary' || block.block_type === 'secondary')) {
      const patternMax = pool.patternMaxIntensities ?? {}
      const intensities = pool.slugIntensities ?? {}
      const gap = block.block_type === 'primary' ? 1 : 2
      const patternOf = (slug: string) => BODY_REGION_TO_PATTERN[exerciseSlugToBodyRegion[slug] ?? ''] ?? null
      for (const p of pool.requiredPatterns) {
        const max = patternMax[p]
        if (!max) continue
        const floor = max - gap
        const chosenForPattern = block.exercises
          .filter((e) => patternOf(e.exercise_slug) === p)
          .map((e) => intensities[e.exercise_slug])
          .filter((v): v is number => v !== undefined)
        if (chosenForPattern.length === 0) continue // fehlendes Muster meldet der Check oben
        if (Math.max(...chosenForPattern) < floor) {
          const better = Object.entries(intensities)
            .filter(([slug, v]) => patternOf(slug) === p && v >= floor)
            .map(([slug, v]) => `${slug} (${v})`)
            .join(', ')
          violations.push(`Block "${block.block_type}", Muster "${p}": gewählte Übung zu leicht (intensity ${Math.max(...chosenForPattern)}, Pool bietet ${max} für dieses Muster). Wähle stattdessen: ${better}`)
        }
      }

      // Muster-Dopplung: erlaubt nur als komplementäres Paar — unterschiedliche
      // Lateralität (schwer bilateral + unilaterale Variante) ODER deutlich
      // andere Intensität (≥2, Hauptlift + Volumen-Variante). Redundante
      // Zwillinge (Pull-up + Chin-up) fressen einen Muster-Slot ohne Mehrwert.
      const lateralities = pool.slugLateralities ?? {}
      const byPattern = new Map<string, string[]>()
      for (const e of block.exercises) {
        const p = patternOf(e.exercise_slug)
        if (!p) continue
        byPattern.set(p, [...(byPattern.get(p) ?? []), e.exercise_slug])
      }
      for (const [p, slugs] of byPattern) {
        for (let i = 0; i < slugs.length; i++) {
          for (let j = i + 1; j < slugs.length; j++) {
            const [a, b] = [slugs[i], slugs[j]]
            const latDiffers = lateralities[a] !== undefined && lateralities[b] !== undefined && lateralities[a] !== lateralities[b]
            const intA = intensities[a]; const intB = intensities[b]
            const intDiffers = intA !== undefined && intB !== undefined && Math.abs(intA - intB) >= 2
            if (!latDiffers && !intDiffers) {
              violations.push(`Block "${block.block_type}", Muster "${p}": "${a}" und "${b}" sind redundant (gleiche Lateralität, ähnliche Intensität) — ersetze eine durch ein anderes Muster oder eine komplementäre Variante (unilateral bzw. deutlich leichter/schwerer)`)
            }
          }
        }
      }

      // Push-Region-Varianz über die Woche: wenn frühere Sessions push bereits
      // mit derselben Region abgedeckt haben und der Pool eine Floor-taugliche
      // Übung einer anderen Push-Region bietet, muss diese gewählt werden
      // (sonst kriegt z.B. die Brust nie einen schweren Press)
      if (previousPushRegions?.length && pool.requiredPatterns.includes('push')) {
        const pushFloor = (patternMax['push'] ?? 0) - gap
        const chosenPush = block.exercises.filter((e) => patternOf(e.exercise_slug) === 'push')
        const chosenRegions = chosenPush.map((e) => exerciseSlugToBodyRegion[e.exercise_slug]).filter(Boolean)
        const coversNewRegion = chosenRegions.some((r) => !previousPushRegions.includes(r))
        if (chosenPush.length > 0 && !coversNewRegion) {
          const alternatives = Object.entries(intensities)
            .filter(([slug, v]) => patternOf(slug) === 'push' && v >= pushFloor
              && !previousPushRegions.includes(exerciseSlugToBodyRegion[slug] ?? ''))
            .map(([slug, v]) => `${slug} (${v}, ${exerciseSlugToBodyRegion[slug]})`)
            .join(', ')
          if (alternatives) {
            violations.push(`Block "${block.block_type}", Muster "push": Region "${chosenRegions.join('/')}" wurde diese Woche schon schwer trainiert — wähle eine andere Push-Region: ${alternatives}`)
          }
        }
      }

      // Chest-Push-Pflicht bei Strength-Fokus: solange die Woche noch keinen
      // chest-Push hat, muss ein Push-Pflicht-Block eine Floor-taugliche
      // chest-Übung wählen — sonst besteht "Push" wochenlang nur aus
      // Overhead-Varianten und die Brust bleibt leer (Prod-Beschwerde)
      if (strengthFocus && pool.requiredPatterns.includes('push')
        && !(previousPushRegions ?? []).includes('chest')) {
        const chestFloor = (patternMax['push'] ?? 0) - gap
        const hasChestPush = block.exercises.some((e) =>
          patternOf(e.exercise_slug) === 'push' && exerciseSlugToBodyRegion[e.exercise_slug] === 'chest')
        if (!hasChestPush) {
          const chestAlternatives = Object.entries(intensities)
            .filter(([slug, v]) => patternOf(slug) === 'push' && v >= chestFloor
              && exerciseSlugToBodyRegion[slug] === 'chest')
            .map(([slug, v]) => `${slug} (${v})`)
            .join(', ')
          if (chestAlternatives) {
            violations.push(`Block "${block.block_type}", Muster "push": Diese Woche fehlt noch ein schwerer chest-Push (User-Fokus strength) — wähle für push eine chest-Übung: ${chestAlternatives}`)
          }
        }
      }
    }
  }

  // Sport-Pflicht-Regionen ("Athletic Floor"): eine offene Region MUSS gewählt
  // werden, (a) in jeder Session, deren Block sie explizit als Ziel-Region führt
  // — sonst erfüllt z.B. IMTP (dominant glute) das hinge-Muster und hamstring
  // geht leer aus — und (b) in der letzten Session über alle Pools hinweg.
  if (remainingRequiredRegions?.length) {
    const chosenRegions = new Set(session.blocks
      .flatMap((b) => b.exercises.map((e) => exerciseSlugToBodyRegion[e.exercise_slug]))
      .filter(Boolean))
    for (const region of remainingRequiredRegions) {
      if (chosenRegions.has(region)) continue
      const relevantPools = isLastSession
        ? blockPools
        : blockPools.filter((p) => p.bodyRegions.includes(region))
      const candidates = [...new Set(relevantPools.flatMap((p) =>
        p.slugs.split(',').map((s) => s.trim()).filter(Boolean)
          .filter((slug) => exerciseSlugToBodyRegion[slug] === region)
          .map((slug) => `${slug} (${p.block_type})`)))]
      if (candidates.length > 0) {
        violations.push(isLastSession
          ? `Sport-Pflicht-Region "${region}" wurde diese Woche noch nicht trainiert und dies ist die letzte Session — wähle eine dieser Übungen: ${candidates.slice(0, 6).join(', ')}`
          : `Sport-Pflicht-Region "${region}" ist Ziel-Region dieser Session und diese Woche noch offen — wähle mindestens eine dieser Übungen: ${candidates.slice(0, 6).join(', ')}`)
        // Zwischen-Sessions: nur EINE offene Region auf einmal erzwingen — sonst
        // verdrängen sich zwei Regionen im selben Block gegenseitig über die
        // Retries (Pingpong); den Rest decken spätere Sessions bzw. die letzte
        if (!isLastSession) break
      }
    }
  }

  return violations
}

// ─── runSessionCD ─────────────────────────────────────────────

export async function runSessionCD(
  si: SessionBuildInput,
  context: {
    sessionIndex: number
    totalSessions: number
    weekPlanSummary: string
    userContext: string
    planName: string
    planDescription: string
    previousSessions: PreviousSessionSummary[]
    exerciseSlugToMeasurementType: Record<string, string>
    exerciseSlugToBodyRegion: Record<string, string>
    allExerciseSlugs: string[]
  },
  openai: OpenAI,
): Promise<PlannedSession> {
  const {
    sessionIndex, totalSessions, weekPlanSummary, userContext,
    planName, planDescription, previousSessions,
    exerciseSlugToMeasurementType, exerciseSlugToBodyRegion, allExerciseSlugs,
  } = context
  const t0 = Date.now()
  const elapsed = (since: number) => `${((Date.now() - since) / 1000).toFixed(1)}s`

  const BLOCK_ORDER: Record<string, number> = {
    warmup: 0, primary: 1, secondary: 2, accessory: 3, cooldown: 4,
  }

  console.log(`Phase C Session ${sessionIndex + 1} (day ${si.spec.day_of_week} [${si.spec.mode_slug}]): mainPools=${si.blockPools.length}, warmup=${si.warmupSlugs.split(',').length}, cooldown=${si.cooldownSlugs.split(',').length}`)

  // ── Phase C: main blocks ──────────────────────────────────────
  const tC = Date.now()
  const sessionExerciseSlugs = [...new Set(
    si.blockPools.flatMap(p => p.slugs.split(',').map(s => s.trim()).filter(Boolean))
  )]
  // Fallback to all DB slugs when pool is empty to prevent hallucination via z.string()
  const effectiveExerciseSlugs = sessionExerciseSlugs.length > 0 ? sessionExerciseSlugs : allExerciseSlugs
  const sessionCategorySlugs = [...new Set(si.blockPools.map(p => p.category_slug))]
  const dynamicMainSchema = buildMainSessionSchema(effectiveExerciseSlugs, sessionCategorySlugs, si.blockPools.length)
  // Push-Regionen (chest/shoulder/tricep), die frühere Main-Blöcke dieser Woche
  // schon abgedeckt haben — steuert die Push-Varianz über die Woche
  const PUSH_REGIONS = new Set(['chest', 'shoulder', 'tricep'])
  const previousPushRegions = [...new Set(previousSessions
    .flatMap((ps) => ps.blocks
      .filter((b) => b.block_type === 'primary' || b.block_type === 'secondary')
      .flatMap((b) => b.exercises.map((e) => exerciseSlugToBodyRegion[e.slug])))
    .filter((r): r is string => !!r && PUSH_REGIONS.has(r)))]

  // Sport-Pflicht-Regionen: was frühere Sessions dieser Woche noch nicht
  // abgedeckt haben — Prompt-Hinweis für jede Session, hart validiert erst
  // in der letzten (die muss die Restlücken schließen)
  const coveredRegions = new Set(previousSessions
    .flatMap((ps) => ps.blocks
      .filter((b) => b.block_type === 'primary' || b.block_type === 'secondary' || b.block_type === 'accessory')
      .flatMap((b) => b.exercises.map((e) => exerciseSlugToBodyRegion[e.slug])))
    .filter(Boolean))
  const remainingRequiredRegions = (si.requiredRegions ?? []).filter((r) => !coveredRegions.has(r))
  const isLastSession = sessionIndex === totalSessions - 1

  const basePrompt = GENERATE_MAIN_BLOCKS_PROMPT({
    sessionIndex,
    totalSessions,
    spec: si.spec,
    duration: si.duration,
    blockPools: si.blockPools,
    bodyRegions: si.bodyRegions,
    weekPlanSummary,
    userContext,
    planName,
    planDescription,
    previousSessions,
    previousPushRegions,
    strengthFocus: si.strengthFocus,
    requiredRegionsRemaining: remainingRequiredRegions,
    isLastSession,
  })

  const findPatternViolations = (session: z.infer<typeof mainSessionSchema>): string[] =>
    findSessionViolations(
      session, si.blockPools, si.spec.mode_slug, exerciseSlugToBodyRegion, previousPushRegions,
      si.strengthFocus, remainingRequiredRegions, isLastSession,
    )

  let mainSession!: z.infer<typeof mainSessionSchema>
  let patternFeedback: string | undefined
  const MAX_PATTERN_ATTEMPTS = 3

  for (let attempt = 1; attempt <= MAX_PATTERN_ATTEMPTS; attempt++) {
    const prompt = patternFeedback
      ? `${basePrompt}\n\n## KORREKTUR (vorheriger Versuch ungültig)\n${patternFeedback}\nWähle die Übungen neu, sodass alle genannten Verstöße behoben sind (PFLICHT-Muster abgedeckt, INTENSITÄTS-PFLICHT erfüllt, keine Duplikate).`
      : basePrompt

    const mainCompletion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [{ role: 'system', content: prompt }],
      response_format: zodResponseFormat(dynamicMainSchema as any, 'data'),
      max_completion_tokens: 16000,
    })

    const mainChoice = mainCompletion.choices[0]
    console.log(`Phase C Session ${sessionIndex + 1} (day ${si.spec.day_of_week}) attempt ${attempt}: finish_reason=${mainChoice.finish_reason}, tokens=${mainCompletion.usage?.completion_tokens} (${elapsed(tC)})`)
    if (mainChoice.finish_reason === 'length') {
      throw new Error(`Phase C Session ${sessionIndex + 1} (day ${si.spec.day_of_week}) cut off`)
    }
    mainSession = JSON.parse(mainChoice.message.content!) as z.infer<typeof mainSessionSchema>

    const violations = findPatternViolations(mainSession)
    if (violations.length === 0) break
    if (attempt < MAX_PATTERN_ATTEMPTS) {
      console.warn(`Phase C Session ${sessionIndex + 1}: Muster-Verletzung, retry — ${violations.join(' | ')}`)
      patternFeedback = violations.join('\n')
    } else {
      console.warn(`⚠️  Phase C Session ${sessionIndex + 1}: Muster-Verletzung nach ${MAX_PATTERN_ATTEMPTS} Versuchen akzeptiert — ${violations.join(' | ')}`)
    }
  }

  console.log(`Phase C Session ${sessionIndex + 1} (day ${si.spec.day_of_week}): ${mainSession.blocks.length} blocks — ${mainSession.blocks.map(b => `${b.block_type}(${b.exercises.length})`).join(', ')}`)
  mainSession.day_of_week = si.spec.day_of_week
  mainSession.mode_slug = si.spec.mode_slug
  mainSession.order_index = sessionIndex
  // LLM-Schätzung auf das Session-Zeitfenster begrenzen
  mainSession.estimated_duration_minutes = Math.min(
    Math.max(mainSession.estimated_duration_minutes, si.duration.min),
    si.duration.max,
  )

  // Coerce measurement fields based on DB measurement_type (overrides LLM guesses)
  let coerceCount = 0
  let amrapCount = 0
  for (const block of mainSession.blocks) {
    for (const ex of block.exercises) {
      const mt = exerciseSlugToMeasurementType[ex.exercise_slug]
      if (mt === 'duration') {
        if (ex.target_reps_min !== 0 || ex.target_reps_max !== 0) { coerceCount++; console.log(`  coerce [duration] ${ex.exercise_slug}: reps ${ex.target_reps_min}–${ex.target_reps_max} → 0`) }
        ex.target_reps_min = 0; ex.target_reps_max = 0
      } else if (mt === 'reps') {
        if (ex.target_duration_seconds !== 0) { coerceCount++; console.log(`  coerce [reps] ${ex.exercise_slug}: duration ${ex.target_duration_seconds}s → 0`) }
        ex.target_duration_seconds = 0
      } else if (mt === 'distance') {
        if (ex.target_reps_min !== 0 || ex.target_reps_max !== 0 || ex.target_duration_seconds !== 0) { coerceCount++ }
        ex.target_reps_min = 0; ex.target_reps_max = 0; ex.target_duration_seconds = 0
      }

      // 'kg' ohne wägbares Equipment → bodyweight koercen: das LLM verordnet
      // sonst Zusatzlast, die der User gar nicht besitzt (und die Übung
      // entgeht fälschlich der AMRAP-Regel)
      if (ex.target_load_type === 'kg' && si.hasLoadableEquipment === false) {
        coerceCount++
        console.log(`  coerce [no-load-equipment] ${ex.exercise_slug}: kg → bodyweight`)
        ex.target_load_type = 'bodyweight'
        ex.target_load_value = 0
      }

      // AMRAP: Bodyweight-Reps-Übungen in Strength-Hauptblöcken haben ohne
      // Zusatzlast keinen Intensitätsregler — alle Sätze gehen deshalb bis
      // kurz vors Muskelversagen. Explosives (Plyos/Jumps/Sprints) bewusst
      // außen vor: dort lebt die Qualität von Wiederholungen fern des Versagens.
      if (si.spec.mode_slug === 'full'
        && (block.block_type === 'primary' || block.block_type === 'secondary')
        && block.focused_category_slug === 'strength'
        && ex.target_load_type === 'bodyweight'
        && (ex.target_reps_min > 0 || ex.target_reps_max > 0)) {
        (ex as any).is_amrap = true
        amrapCount++
      }
    }
  }
  if (coerceCount > 0) console.log(`Phase C Session ${sessionIndex + 1}: coerced ${coerceCount} measurement mismatch(es)`)
  if (amrapCount > 0) console.log(`Phase C Session ${sessionIndex + 1}: ${amrapCount} exercise(s) marked amrap_last_set`)

  // ── Phase D: warmup + cooldown (pools already ready from Phase B) ─────
  const tD = Date.now()
  const warmupSlugsList = si.warmupSlugs.split(',').map(s => s.trim()).filter(Boolean)
  const cooldownSlugsList = si.cooldownSlugs.split(',').map(s => s.trim()).filter(Boolean)
  // Fallback to all DB slugs for warmup/cooldown if pools empty
  const effectiveWarmupSlugs = warmupSlugsList.length > 0 ? warmupSlugsList : allExerciseSlugs
  const effectiveCooldownSlugs = cooldownSlugsList.length > 0 ? cooldownSlugsList : allExerciseSlugs
  const wcCategorySlugs = [...new Set([...si.warmupCategorySlugs, ...si.cooldownCategorySlugs])]
  const dynamicWcSchema = buildWarmupCooldownSchema(effectiveWarmupSlugs, effectiveCooldownSlugs, wcCategorySlugs)
  const mainBlocksSummary = mainSession.blocks.map((b) =>
    `${b.block_type} (${b.focused_category_slug}): ${b.exercises.map((e) => e.exercise_slug).join(', ')}`
  ).join('\n')
  const mainBlocksSlugs = mainSession.blocks.flatMap((b) => b.exercises.map((e) => e.exercise_slug))

  const wcCompletion = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    reasoning_effort: 'low',
    messages: [{
      role: 'system',
      content: GENERATE_WARMUP_COOLDOWN_PROMPT({
        spec: si.spec,
        sessionName: mainSession.name,
        mainBlocksSummary,
        mainBlocksSlugs,
        bodyRegions: si.bodyRegions,
        warmupExercisesString: si.warmupExercisesString,
        warmupSlugs: si.warmupSlugs,
        warmupCategorySlugs: si.warmupCategorySlugs,
        cooldownExercisesString: si.cooldownExercisesString,
        cooldownSlugs: si.cooldownSlugs,
        cooldownCategorySlugs: si.cooldownCategorySlugs,
      }),
    }],
    response_format: zodResponseFormat(dynamicWcSchema as any, 'data'),
    max_completion_tokens: 3000,
  })

  const wcChoice = wcCompletion.choices[0]
  console.log(`Phase D Session ${sessionIndex + 1} (day ${si.spec.day_of_week}): finish_reason=${wcChoice.finish_reason}, tokens=${wcCompletion.usage?.completion_tokens} (${elapsed(tD)})`)

  const wcBlocks: z.infer<typeof warmupCooldownSchema>['blocks'] = []
  if (wcChoice.finish_reason !== 'length' && wcChoice.message.content) {
    try {
      const parsed = JSON.parse(wcChoice.message.content) as z.infer<typeof warmupCooldownSchema>
      // Coerce measurement fields for warmup/cooldown exercises
      let wcCoerceCount = 0
      for (const block of parsed.blocks) {
        for (const ex of block.exercises) {
          const mt = exerciseSlugToMeasurementType[ex.exercise_slug]
          if (mt === 'duration') {
            if (ex.target_reps_min !== 0 || ex.target_reps_max !== 0) { wcCoerceCount++; console.log(`  coerce [duration] ${ex.exercise_slug}: reps ${ex.target_reps_min}–${ex.target_reps_max} → 0`) }
            ex.target_reps_min = 0; ex.target_reps_max = 0
          } else if (mt === 'reps') {
            if (ex.target_duration_seconds !== 0) { wcCoerceCount++; console.log(`  coerce [reps] ${ex.exercise_slug}: duration ${ex.target_duration_seconds}s → 0`) }
            ex.target_duration_seconds = 0
          } else if (mt === 'distance') {
            if (ex.target_reps_min !== 0 || ex.target_reps_max !== 0 || ex.target_duration_seconds !== 0) { wcCoerceCount++ }
            ex.target_reps_min = 0; ex.target_reps_max = 0; ex.target_duration_seconds = 0
          }
        }
      }
      if (wcCoerceCount > 0) console.log(`Phase D Session ${sessionIndex + 1}: coerced ${wcCoerceCount} measurement mismatch(es)`)
      // Duplikate im selben Block (z.B. zweimal banded_good_morning im Warmup)
      // deterministisch entfernen — die Hauptblöcke validiert Phase C, Phase D nicht
      for (const block of parsed.blocks) {
        const seenSlugs = new Set<string>()
        block.exercises = block.exercises.filter((ex) => {
          if (seenSlugs.has(ex.exercise_slug)) {
            console.log(`Phase D Session ${sessionIndex + 1}: Duplikat "${ex.exercise_slug}" im ${block.block_type} entfernt`)
            return false
          }
          seenSlugs.add(ex.exercise_slug)
          return true
        })
      }
      wcBlocks.push(...parsed.blocks)
    } catch (err) {
      console.error(`Phase D Session ${sessionIndex + 1}: JSON parse error: ${err}`)
      // Re-throw so Temporal can retry the activity
      throw err
    }
  }

  // ── Merge C + D ───────────────────────────────────────────────
  const allBlocks = [...mainSession.blocks, ...wcBlocks]
  allBlocks.sort((a, b) => (BLOCK_ORDER[a.block_type] ?? 99) - (BLOCK_ORDER[b.block_type] ?? 99))
  allBlocks.forEach((b, idx) => { b.order_index = idx })

  const session: PlannedSession = { ...mainSession, blocks: allBlocks, environment_id: si.environment_id }

  return session
}
