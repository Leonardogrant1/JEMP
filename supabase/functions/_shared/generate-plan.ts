import { SupabaseClient } from "@supabase/supabase-js"
import { OpenAI } from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"
import { GENERATE_PLAN_OVERVIEW_PROMPT, GENERATE_PRIMARY_SECONDARY_PROMPT, GENERATE_SESSION_PROMPT } from "./prompts.ts"
import { planOverviewSchema, primarySecondarySchema, sessionSchema } from "./schemas.ts"
import { PlanGenerationInput, PlannedSessionSummary, SessionModeSlug, WeeklySchedule } from "./types.ts"

// ─── Load score helpers ───────────────────────────────────────

export function intensityToPoints(intensity: number): number {
  if (intensity <= 2) return 1
  if (intensity <= 4) return 2
  if (intensity <= 6) return 3
  if (intensity <= 8) return 4
  return 5
}

export function pointsToLoadProfile(points: number): "low" | "medium" | "high" {
  if (points <= 4) return "low"
  if (points <= 10) return "medium"
  return "high"
}

// ─── Region group helpers ─────────────────────────────────────

const LOWER_BODY_REGIONS = new Set(["ankle", "calf", "knee", "quad", "hamstring", "glute", "hip", "groin"])
const UPPER_BODY_REGIONS = new Set(["thoracic", "upper_back", "chest", "shoulder", "bicep", "tricep", "forearm", "neck"])
const CORE_REGIONS = new Set(["lower_back", "core", "obliques"])

type RegionGroup = "lower_body" | "upper_body" | "core" | "mixed"

function classifyRegionGroup(regions: string[]): RegionGroup {
  if (regions.length === 0) return "mixed"
  const hasLower = regions.some((r) => LOWER_BODY_REGIONS.has(r))
  const hasUpper = regions.some((r) => UPPER_BODY_REGIONS.has(r))
  if (hasLower && hasUpper) return "mixed"
  if (hasLower) return "lower_body"
  if (hasUpper) return "upper_body"
  return "core"
}

function isWarmupCooldownAllowed(bodyRegion: string | null | undefined, group: RegionGroup): boolean {
  if (group === "mixed") return true
  if (!bodyRegion || bodyRegion === "full_body") return true
  if (CORE_REGIONS.has(bodyRegion)) return true // core always relevant
  switch (group) {
    case "lower_body": return LOWER_BODY_REGIONS.has(bodyRegion)
    case "upper_body": return UPPER_BODY_REGIONS.has(bodyRegion)
    case "core": return true // if session is core-focused, allow everything
  }
}

 

// ─── Mode determination ───────────────────────────────────────

const MODE_WEIGHTS: Record<SessionModeSlug, number> = {
  recovery: 0, activation: 1, reduced: 2, full: 3,
}

export const SESSION_MODE_DURATION: Record<SessionModeSlug, { min: number; max: number; overrides_user: boolean }> = {
  full:       { min: 60, max: 90, overrides_user: false },
  reduced:    { min: 45, max: 60, overrides_user: false },
  activation: { min: 20, max: 30, overrides_user: true },
  recovery:   { min: 15, max: 25, overrides_user: true },
}

function lighterMode(a: SessionModeSlug, b: SessionModeSlug): SessionModeSlug {
  return MODE_WEIGHTS[a] <= MODE_WEIGHTS[b] ? a : b
}

export function determineSessionModes(
  preferred_workout_days: number[],
  weekly_schedule: WeeklySchedule,
  load_profile: "low" | "medium" | "high",
): Array<{ day_of_week: number; mode_slug: SessionModeSlug }> {
  const gameDays = new Set(
    weekly_schedule.sessions
      .filter((s) => s.type === "game" || s.type === "tournament")
      .map((s) => s.day_of_week),
  )

  // Precompute days with significant sport load (intensity ≥ 4, non-game)
  const sportLoadDays = new Set(
    weekly_schedule.sessions
      .filter((s) => s.type !== "game" && s.type !== "tournament" && s.intensity >= 8)
      .map((s) => s.day_of_week),
  )

  function isDayIsolated(day: number): boolean {
    const prev = day === 1 ? 7 : day - 1
    const next = day === 7 ? 1 : day + 1
    return !sportLoadDays.has(prev) && !sportLoadDays.has(next)
  }

  // Rule 3 baseline: low → full, medium → depends on day isolation, high → reduced
  function loadBaseline(day: number): SessionModeSlug {
    if (load_profile === "low") return "full"
    if (load_profile === "medium") return isDayIsolated(day) ? "full" : "reduced"
    return "reduced"
  }

  const result: Array<{ day_of_week: number; mode_slug: SessionModeSlug }> = []

  for (const day of [...preferred_workout_days].sort()) {
    // Skip game/tournament days
    if (gameDays.has(day)) continue

    const constraints: SessionModeSlug[] = [loadBaseline(day)]

    // Rule 1: sport session on this day
    const sportSession = weekly_schedule.sessions.find((s) => s.day_of_week === day)
    if (sportSession) {
      if (sportSession.intensity >= 8) constraints.push("recovery")
      else if (sportSession.intensity >= 7) constraints.push("activation")
      // 0–6: FULL possible, no additional constraint
    }

    // Rule 2: game day proximity (wrap-around not handled — week is linear 1–7)
    for (const gameDay of gameDays) {
      const diff = gameDay - day
      if (diff === 1) constraints.push("activation")    // 1 day before game
      else if (diff === -1) constraints.push("recovery") // 1 day after game
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

// ─── Main function ────────────────────────────────────────────

export async function generatePlan(
  input: PlanGenerationInput,
  supabase: SupabaseClient,
  openai: OpenAI,
): Promise<{ name: string; description: string; sessions: z.infer<typeof sessionSchema>[] }> {
  const {
    sport_slug,
    preferred_workout_days,
    min_session_duration,
    max_session_duration,
    weekly_schedule = { sessions: [], notes: null },
    load_score = 0,
    load_profile = "low",
    environment_ids,
    environment_slugs,
    equipment_ids,
    category_levels,
    sport_required_categories,
    user_focus_categories,
  } = input

  const userEnvironmentIds = new Set(environment_ids)
  const userEquipmentSet = new Set(equipment_ids)
  const levelMap = new Map(category_levels.map((cl) => [cl.category_id, cl.level_score]))
  const hasLevelData = category_levels.length > 0

  // ── 1. Determine session modes ───────────────────────────────

  const sessionSpecs = determineSessionModes(preferred_workout_days, weekly_schedule, load_profile)

  if (sessionSpecs.length === 0) {
    throw new Error("No sessions to generate — preferred_workout_days resulted in zero sessions after mode determination.")
  }

  // ── 2. Fetch exercise data ───────────────────────────────────

  const [
    { data: exerciseEnvRows },
    { data: allEnvRows },
    { data: allEquipmentRows },
    { data: allExercises },
  ] = await Promise.all([
    supabase.from("exercise_environments").select("exercise_id, environment_id"),
    supabase.from("environments").select("id, slug"),
    supabase.from("exercise_equipments").select("exercise_id, equipment_id"),
    supabase.from("exercises").select("*, intensity_score, exercise_type, measurement_type, categories(id, slug), exercise_blocks(block_types(slug))"),
  ])

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

  // ── 3. Base exercise filter (env, equipment, level) ──────────

  const focusCategorySlugs = new Set(user_focus_categories.map((f) => f.category))
  const sportCategorySlugs = new Set(sport_required_categories.map((s) => s.category))

  function filterExercises(forMode: SessionModeSlug, excludeSlugs: Set<string>) {
    const filtered = (allExercises ?? []).filter((exercise) => {
      if (excludeSlugs.has(exercise.slug)) return false

      // Mode restriction via intensity_score + exercise_type
      const exerciseType = exercise.exercise_type
      const intensityScore = exercise.intensity_score

      switch (forMode) {
        case "full":
          // dynamic only, all intensities
          if (exerciseType !== null && exerciseType !== "dynamic") return false
          break
        case "reduced":
          // dynamic only, intensity ≤ 7
          if (exerciseType !== null && exerciseType !== "dynamic") return false
          if (intensityScore !== null && intensityScore > 7) return false
          break
        case "activation":
          // dynamic + restorative, intensity ≤ 5
          if (exerciseType !== null && exerciseType === "breathing") return false
          if (intensityScore !== null && intensityScore > 5) return false
          break
        case "recovery":
          // all types, intensity ≤ 3
          if (intensityScore !== null && intensityScore > 3) return false
          break
      }

      // Equipment
      const requiredEquipment = exerciseEquipmentMap.get(exercise.id)
      if (requiredEquipment && requiredEquipment.size > 0 && userEquipmentSet.size > 0) {
        let hasMatch = false
        for (const eqId of requiredEquipment) {
          if (userEquipmentSet.has(eqId)) { hasMatch = true; break }
        }
        if (!hasMatch) return false
      }

      // Environment
      const allowedEnvs = exerciseEnvMap.get(exercise.id)
      if (allowedEnvs && allowedEnvs.size > 0 && userEnvironmentIds.size > 0) {
        let hasMatch = false
        for (const envId of allowedEnvs) {
          if (userEnvironmentIds.has(envId)) { 
            hasMatch = true
            break 
          }
        }
        if (!hasMatch) return false
      }

      // Level
      if (hasLevelData && exercise.category_id) {
        const userLevel = levelMap.get(exercise.category_id)
        if (userLevel === undefined) return false
        if (userLevel < exercise.min_level || userLevel > exercise.max_level) return false
      }

      return true
    })

    // Cap at 120, prioritise focus + sport categories
    if (filtered.length <= 120) return filtered
    return [
      ...filtered.filter((e: any) =>
        focusCategorySlugs.has(e.categories?.slug) || sportCategorySlugs.has(e.categories?.slug)
      ),
      ...filtered
        .filter((e: any) =>
          !focusCategorySlugs.has(e.categories?.slug) && !sportCategorySlugs.has(e.categories?.slug)
        )
        .sort(() => Math.random() - 0.5),
    ].slice(0, 120)
  }

  function exercisesToString(exercises: ReturnType<typeof filterExercises>) {
    return exercises.map((e) => {
      const blocks = (e.exercise_blocks)
        ?.map((b: any) => b.block_types?.slug)
        .filter(Boolean)
        .join(", ") ?? ""
      const allowedEnvs = exerciseEnvMap.get(e.id)
      const envTag = allowedEnvs && allowedEnvs.size > 0
        ? `, environments: [${[...allowedEnvs].map((id) => envSlugMap.get(id) ?? id).join(", ")}]`
        : ""
      const intensityTag = e.intensity_score !== null && e.intensity_score !== undefined ? `, intensity: ${e.intensity_score}` : ""
      const typeTag = e.exercise_type ? `, type: ${e.exercise_type}` : ""
      const regionTag = e.body_region ? `, body_region: ${e.body_region}` : ""
      return `[${e.slug}]: ${e.name}, category: ${e.categories?.slug}, blocks: [${blocks}], measurement: ${e.measurement_type ?? "reps_or_duration"}${intensityTag}${typeTag}${regionTag}${envTag}`
    }).join("\n")
  }

  // ── 4. Generate plan overview (name + description) ───────────

  const overviewContext = JSON.stringify({
    sport_slug,
    load_profile,
    load_score,
    sessions: sessionSpecs.map((s) => ({
      day_of_week: s.day_of_week,
      mode_slug: s.mode_slug,
      ...targetDuration(s.mode_slug, min_session_duration, max_session_duration),
    })),
    sport_required_categories,
    user_focus_categories,
  }, null, 2)

  const overviewCompletion = await openai.chat.completions.create({
    model: "gpt-5.1",
    messages: [{ role: "system", content: GENERATE_PLAN_OVERVIEW_PROMPT(overviewContext) }],
    response_format: zodResponseFormat(planOverviewSchema, "data"),
    max_completion_tokens: 500,
  })

  const overviewChoice = overviewCompletion.choices[0]
  if (overviewChoice.finish_reason === "length") throw new Error("Plan overview was cut off.")
  const overview = JSON.parse(overviewChoice.message.content!) as z.infer<typeof planOverviewSchema>

  console.log("overview", overview)
  // ── 5. Generate sessions sequentially ────────────────────────

  const userContext = JSON.stringify({
    sport_slug,
    load_profile,
    load_score,
    ...(weekly_schedule.sessions.length > 0 ? { weekly_schedule } : {}),
    user_environments: environment_slugs,
    sport_required_categories,
    user_focus_categories,
  }, null, 2)

  const plannedSessions: z.infer<typeof sessionSchema>[] = []
  const planContext: PlannedSessionSummary[] = []
  const usedExerciseSlugs = new Set<string>()

  for (let i = 0; i < sessionSpecs.length; i++) {
    const spec = sessionSpecs[i]
    const duration = targetDuration(spec.mode_slug, min_session_duration, max_session_duration)

    const exercises = filterExercises(spec.mode_slug, usedExerciseSlugs)
    const isTwoPhaseMode = spec.mode_slug === "full" || spec.mode_slug === "reduced"

    // ── Phase 1: select primary + secondary (full/reduced only) ──
    let preDecided: { primary: { category_slug: string; exercise_slugs: string[] }; secondary: { category_slug: string; exercise_slugs: string[] }; loadedBodyRegions: string[] } | undefined

    if (isTwoPhaseMode) {
      // Only pass exercises eligible for primary/secondary blocks
      const primarySecondaryExercises = exercises.filter((e: any) => {
        const blockSlugs = (e.exercise_blocks as any[])?.map((b: any) => b.block_types?.slug) ?? []
        return blockSlugs.includes("primary") || blockSlugs.includes("secondary")
      })

      const p1Completion = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [{
          role: "system",
          content: GENERATE_PRIMARY_SECONDARY_PROMPT({
            spec,
            exercisesString: exercisesToString(primarySecondaryExercises),
            exerciseSlugs: primarySecondaryExercises.map((e: any) => e.slug).join("\n"),
            userContext,
            planName: overview.name,
            planDescription: overview.description,
            planContext,
          }),
        }],
        response_format: zodResponseFormat(primarySecondarySchema, "data"),
        max_completion_tokens: 500,
      })

      if (p1Completion.choices[0].finish_reason !== "length") {
        const p1 = JSON.parse(p1Completion.choices[0].message.content!) as z.infer<typeof primarySecondarySchema>
        const p1Slugs = [...p1.primary.exercise_slugs, ...p1.secondary.exercise_slugs]
        const loadedBodyRegions = p1Slugs
          .map((slug) => exercises.find((e: any) => e.slug === slug)?.body_region as string | null)
          .filter((r): r is string => !!r)
        preDecided = { ...p1, loadedBodyRegions }
      }
    }

    // ── Build exercise lists for Phase 2 ─────────────────────────
    const regionGroup = preDecided ? classifyRegionGroup(preDecided.loadedBodyRegions) : "mixed"

    // Warmup/cooldown exercises: filter by region group
    const warmupCooldownExercises = isTwoPhaseMode
      ? exercises.filter((e: any) => {
          const blockSlugs = (e.exercise_blocks as any[])?.map((b: any) => b.block_types?.slug) ?? []
          const isWarmupOrCooldown = blockSlugs.includes("warmup") || blockSlugs.includes("cooldown")
          if (!isWarmupOrCooldown) return false
          return isWarmupCooldownAllowed(e.body_region, regionGroup)
        })
      : []

    // Primary/secondary/accessory exercises (non-warmup/cooldown)
    const mainExercises = isTwoPhaseMode
      ? exercises.filter((e: any) => {
          const blockSlugs = (e.exercise_blocks as any[])?.map((b: any) => b.block_types?.slug) ?? []
          return !blockSlugs.every((s: string) => s === "warmup" || s === "cooldown")
        })
      : exercises

    const exercisesString = exercisesToString(mainExercises)
    const exerciseSlugs = mainExercises.map((e: any) => e.slug).join("\n")
    const warmupCooldownExercisesString = isTwoPhaseMode ? exercisesToString(warmupCooldownExercises) : undefined
    const warmupCooldownSlugs = isTwoPhaseMode ? warmupCooldownExercises.map((e: any) => e.slug).join("\n") : undefined

    // ── Phase 2: full session generation ─────────────────────────
    const sessionCompletion = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [{
        role: "system",
        content: GENERATE_SESSION_PROMPT({
          sessionIndex: i,
          totalSessions: sessionSpecs.length,
          spec,
          duration,
          exercisesString,
          exerciseSlugs,
          warmupCooldownExercisesString,
          warmupCooldownSlugs,
          preDecided,
          userContext,
          planName: overview.name,
          planDescription: overview.description,
          planContext,
        }),
      }],
      response_format: zodResponseFormat(sessionSchema, "data"),
      max_completion_tokens: 4000,
    })

    const sessionChoice = sessionCompletion.choices[0]
    if (sessionChoice.finish_reason === "length") {
      console.warn(`Session ${i + 1} was cut off — skipping.`)
      continue
    }

    const session = JSON.parse(sessionChoice.message.content!) as z.infer<typeof sessionSchema>
    if (!session) continue

    // Force correct metadata (day, mode, order)
    session.day_of_week = spec.day_of_week
    session.mode_slug = spec.mode_slug
    session.order_index = i

    // Enforce fixed block order regardless of what the AI returned
    const BLOCK_ORDER: Record<string, number> = {
      warmup: 0, primary: 1, secondary: 2, accessory: 3, cooldown: 4,
    }
    session.blocks.sort((a, b) => (BLOCK_ORDER[a.block_type] ?? 99) - (BLOCK_ORDER[b.block_type] ?? 99))
    session.blocks.forEach((b, idx) => { b.order_index = idx })

    // Track context for next sessions
    const primaryBlock = session.blocks.find((b) => b.block_type === "primary")
    const secondaryBlock = session.blocks.find((b) => b.block_type === "secondary")
    const sessionExerciseSlugs = session.blocks.flatMap((b) => b.exercises.map((e) => e.exercise_slug))

    planContext.push({
      day_of_week: spec.day_of_week,
      mode_slug: spec.mode_slug,
      name: session.name,
      primary_category: preDecided?.primary.category_slug ?? primaryBlock?.focused_category_slug ?? "",
      secondary_category: preDecided?.secondary.category_slug ?? secondaryBlock?.focused_category_slug ?? "",
      exercise_slugs: sessionExerciseSlugs,
    })

    for (const slug of sessionExerciseSlugs) usedExerciseSlugs.add(slug)

    plannedSessions.push(session)
  }

  return {
    name: overview.name,
    description: overview.description,
    sessions: plannedSessions,
  }
}
