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
  blockPools: Array<{
    block_type: 'primary' | 'secondary' | 'accessory'
    category_slug: string
    exercisesString: string
    slugs: string
    availablePatterns?: string[]
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
  return { min: Math.max(userMin, r.min), max: Math.min(userMax, r.max) }
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
  ] = await Promise.all([
    supabase.from('exercise_environments').select('exercise_id, environment_id'),
    supabase.from('environments').select('id, slug'),
    supabase.from('exercise_equipments').select('exercise_id, equipment_id'),
    supabase.from('exercises').select('*, intensity_score, exercise_type, measurement_type, is_sport_specific, categories(id, slug), exercise_blocks(block_types(slug))'),
    (supabase as any).from('exercise_sport_groups').select('exercise_id, sport_group'),
  ])
  console.log(`[t=${elapsed(t0)}] DB fetch done (${elapsed(tDb)})`)

  const categorySlugs = sport_required_categories.map((c) => c.category)

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
    return exercises.filter((e: any) =>
      !e.body_region || e.body_region === 'full_body' || bodyRegions.has(e.body_region)
    )
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
      const regionTag = e.body_region ? `, body_region: ${e.body_region}` : ''
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
  }, null, 2)

  const tPhaseA = Date.now()
  console.log(`[t=${elapsed(t0)}] Phase A — calling week planner: ${sessionSpecs.length} sessions, categorySlugs=[${categorySlugs.join(', ')}]`)

  const dynamicWeekPlanSchema = buildWeekPlanSchema(categorySlugs, environment_slugs)

  const weekPlanCompletion = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [{
      role: 'system',
      content: GENERATE_WEEK_PLAN_PROMPT({
        sessions: sessionSpecs.map((s) => ({
          ...s,
          ...targetDuration(s.mode_slug, min_session_duration, max_session_duration),
        })),
        userContext,
        categorySlugs,
        environmentSlugs: environment_slugs,
        dayPresetEnvironments,
        userFocusCategories: user_focus_categories,
      }),
    }],
    reasoning_effort: 'low',
    response_format: zodResponseFormat(dynamicWeekPlanSchema as any, 'data'),
    max_completion_tokens: 4000,
  })

  const weekPlanChoice = weekPlanCompletion.choices[0]
  console.log(`[t=${elapsed(t0)}] Phase A done (${elapsed(tPhaseA)}) — finish_reason=${weekPlanChoice.finish_reason}, tokens=${weekPlanCompletion.usage?.completion_tokens}`)
  if (weekPlanChoice.finish_reason === 'length') throw new Error('Week plan was cut off.')
  const weekPlan = JSON.parse(weekPlanChoice.message.content!) as z.infer<typeof weekPlanSchema>

  console.log('Phase A — week plan:', JSON.stringify(weekPlan, null, 2))

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
  for (const [category, days] of primaryCategoryCounts) {
    if (days.length > 1) {
      console.warn(`⚠️  Phase A violation: primary category "${category}" used on multiple days: ${days.map((d) => DAY_NAMES[d] ?? `Tag ${d}`).join(', ')} — sessions will feel similar`)
    }
  }

  const weekPlanSummary = weekPlan.sessions.map((s) => {
    const blocksText = s.blocks.map((b) => `${b.block_type}=${b.category_slug}`).join(', ')
    const spec = sessionSpecs.find((sp) => sp.day_of_week === s.day_of_week)
    const regionsText = s.body_regions.length > 0 ? ` | regions: ${s.body_regions.join(', ')}` : ''
    return `- ${DAY_NAMES[s.day_of_week] ?? `Tag ${s.day_of_week}`} [${spec?.mode_slug ?? '?'}]: ${blocksText || 'keine Hauptblöcke'}${regionsText}`
  }).join('\n')

  // ── 5. Phase B: Code builds all exercise pools per session ───

  const BODY_REGION_TO_PATTERN: Record<string, string> = {
    quad: 'squat',
    hamstring: 'hinge', glute: 'hinge',
    chest: 'push', shoulder: 'push', tricep: 'push',
    upper_back: 'pull', bicep: 'pull',
  }

  type BlockPool = {
    block_type: 'primary' | 'secondary' | 'accessory'
    category_slug: string
    exercisesString: string
    slugs: string
    availablePatterns?: string[]
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
    const sessionBodyRegions = new Set(weekPlanSession?.body_regions ?? [])

    // Resolve session environment: user preset → Phase A LLM choice → null
    const sessionEnvSlug = (weekPlanSession as any)?.environment_slug
    const sessionEnvId = dayEnvMap.get(spec.day_of_week)
      ?? (sessionEnvSlug ? envSlugToIdMap.get(sessionEnvSlug) : undefined)
      ?? null

    console.log(`Phase B day ${spec.day_of_week}: environment=${sessionEnvSlug ?? 'none'} (id=${sessionEnvId ?? 'null'})`)

    const blockPools: BlockPool[] = plannedBlocks.map((block) => {
      const pool = filterByCategoryForMode(block.category_slug, spec.mode_slug, sessionEnvId)

      if (pool.length === 0) {
        console.warn(`Phase B day ${spec.day_of_week} [${spec.mode_slug}] ${block.block_type}/${block.category_slug}: EMPTY pool — no exercises for this category`)
      } else {
        console.log(`Phase B day ${spec.day_of_week} [${spec.mode_slug}] ${block.block_type}/${block.category_slug}: ${pool.length} exercises`)
      }
      const availablePatterns = block.category_slug === 'strength'
        ? [...new Set(pool.map((e: any) => BODY_REGION_TO_PATTERN[e.body_region]).filter(Boolean))]
        : undefined

      return {
        block_type: block.block_type,
        category_slug: block.category_slug,
        exercisesString: exercisesToString(pool),
        slugs: pool.map((e: any) => e.slug).join(', '),
        availablePatterns,
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
  const MIN_BLOCK_POOL = 3

  for (const si of sessionBuildInputs) {
    // Never override user-preset environments
    if (dayEnvMap.has(si.spec.day_of_week)) continue

    const tooSmall = si.blockPools.filter(
      (p) => p.slugs.split(',').filter(Boolean).length < MIN_BLOCK_POOL,
    )
    if (tooSmall.length === 0) continue

    const tooSmallDesc = tooSmall
      .map((p) => `${p.block_type}/${p.category_slug}=${p.slugs.split(',').filter(Boolean).length}`)
      .join(', ')
    console.log(`Pool Opt day ${si.spec.day_of_week}: small pools: ${tooSmallDesc} (threshold=${MIN_BLOCK_POOL})`)

    const scoreEnv = (envId: string | null): number =>
      si.blockPools.reduce((sum, block) => {
        return sum + filterByCategoryForMode(block.category_slug, si.spec.mode_slug, envId).length
      }, 0)

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

    // Recompute block pools with new environment
    for (const block of si.blockPools) {
      const pool = filterByCategoryForMode(block.category_slug, si.spec.mode_slug, bestEnvId)
      block.exercisesString = exercisesToString(pool)
      block.slugs = pool.map((e: any) => e.slug).join(', ')
      console.log(`     ${block.block_type}/${block.category_slug}: → ${pool.length} exercises`)
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

  // Build compact measurement type lookup
  const exerciseSlugToMeasurementType: Record<string, string> = {}
  for (const e of allExercises ?? []) {
    if (e.slug && e.measurement_type) {
      exerciseSlugToMeasurementType[e.slug] = e.measurement_type
    }
  }

  const allExerciseSlugs = (allExercises ?? []).map((e: any) => e.slug).filter(Boolean)

  return {
    weekPlan,
    sessionBuildInputs,
    weekPlanSummary,
    userContext,
    exerciseSlugToMeasurementType,
    allExerciseSlugs,
    environmentIds: environment_ids,
  }
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
    allExerciseSlugs: string[]
  },
  openai: OpenAI,
): Promise<PlannedSession> {
  const {
    sessionIndex, totalSessions, weekPlanSummary, userContext,
    planName, planDescription, previousSessions,
    exerciseSlugToMeasurementType, allExerciseSlugs,
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
  const mainCompletion = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [{
      role: 'system',
      content: GENERATE_MAIN_BLOCKS_PROMPT({
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
      }),
    }],
    response_format: zodResponseFormat(dynamicMainSchema as any, 'data'),
    max_completion_tokens: 5000,
  })

  const mainChoice = mainCompletion.choices[0]
  console.log(`Phase C Session ${sessionIndex + 1} (day ${si.spec.day_of_week}): finish_reason=${mainChoice.finish_reason}, tokens=${mainCompletion.usage?.completion_tokens} (${elapsed(tC)})`)
  if (mainChoice.finish_reason === 'length') {
    throw new Error(`Phase C Session ${sessionIndex + 1} (day ${si.spec.day_of_week}) cut off`)
  }
  const mainSession = JSON.parse(mainChoice.message.content!) as z.infer<typeof mainSessionSchema>
  console.log(`Phase C Session ${sessionIndex + 1} (day ${si.spec.day_of_week}): ${mainSession.blocks.length} blocks — ${mainSession.blocks.map(b => `${b.block_type}(${b.exercises.length})`).join(', ')}`)
  mainSession.day_of_week = si.spec.day_of_week
  mainSession.mode_slug = si.spec.mode_slug
  mainSession.order_index = sessionIndex

  // Coerce measurement fields based on DB measurement_type (overrides LLM guesses)
  let coerceCount = 0
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
    }
  }
  if (coerceCount > 0) console.log(`Phase C Session ${sessionIndex + 1}: coerced ${coerceCount} measurement mismatch(es)`)

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
