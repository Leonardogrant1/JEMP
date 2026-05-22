import { SupabaseClient } from "@supabase/supabase-js"
import { OpenAI } from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"
import { GENERATE_SESSION_PROMPT, GENERATE_WEEK_PLAN_PROMPT } from "./prompts.ts"
import { sessionSchema, weekPlanSchema } from "./schemas.ts"
import { PlanGenerationInput, SessionModeSlug, WeeklySchedule } from "./types.ts"



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
  load_profile: "low" | "medium" | "high",
): Array<{ day_of_week: number; mode_slug: SessionModeSlug }> {
  const gameDays = new Set(
    weekly_schedule.sessions
      .filter((s) => s.type === "game" || s.type === "tournament")
      .map((s) => s.day_of_week),
  )

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

  function loadBaseline(day: number): SessionModeSlug {
    if (load_profile === "low") return "full"
    if (load_profile === "medium") return isDayIsolated(day) ? "full" : "reduced"
    return "reduced"
  }

  const result: Array<{ day_of_week: number; mode_slug: SessionModeSlug }> = []

  for (const day of [...preferred_workout_days].sort()) {
    if (gameDays.has(day)) continue

    const constraints: SessionModeSlug[] = [loadBaseline(day)]

    const sportSession = weekly_schedule.sessions.find((s) => s.day_of_week === day)
    if (sportSession) {
      if (sportSession.intensity >= 8) constraints.push("recovery")
      else if (sportSession.intensity >= 7) constraints.push("activation")
    }

    for (const gameDay of gameDays) {
      const diff = gameDay - day
      if (diff === 1) constraints.push("activation")
      else if (diff === -1) constraints.push("recovery")
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

  const exerciseBySlug = new Map<string, any>()
  for (const e of allExercises ?? []) exerciseBySlug.set(e.slug, e)



  // ── 3. Exercise filter helpers ───────────────────────────────

  const focusCategorySlugs = new Set(user_focus_categories.map((f) => f.category))
  const sportCategorySlugs = new Set(sport_required_categories.map((s) => s.category))

  function filterExercises(forMode: SessionModeSlug, onlyCategorySlugs?: string[]) {
    const categoryFilter = onlyCategorySlugs ? new Set(onlyCategorySlugs) : null

    const filtered = (allExercises ?? []).filter((exercise) => {
      if (categoryFilter && !categoryFilter.has(exercise.categories?.slug)) return false

      const exerciseType = exercise.exercise_type
      const intensityScore = exercise.intensity_score

      switch (forMode) {
        case "full":
          if (exerciseType !== null && exerciseType !== "dynamic") return false
          break
        case "reduced":
          if (exerciseType !== null && exerciseType !== "dynamic") return false
          if (intensityScore !== null && intensityScore > 7) return false
          break
        case "activation":
          if (exerciseType !== null && exerciseType === "breathing") return false
          if (intensityScore !== null && intensityScore > 5) return false
          break
        case "recovery":
          if (intensityScore !== null && intensityScore > 3) return false
          break
      }

      const requiredEquipment = exerciseEquipmentMap.get(exercise.id)
      if (requiredEquipment && requiredEquipment.size > 0 && userEquipmentSet.size > 0) {
        let hasMatch = false
        for (const eqId of requiredEquipment) {
          if (userEquipmentSet.has(eqId)) { hasMatch = true; break }
        }
        if (!hasMatch) return false
      }

      const allowedEnvs = exerciseEnvMap.get(exercise.id)
      if (allowedEnvs && allowedEnvs.size > 0 && userEnvironmentIds.size > 0) {
        let hasMatch = false
        for (const envId of allowedEnvs) {
          if (userEnvironmentIds.has(envId)) { hasMatch = true; break }
        }
        if (!hasMatch) return false
      }

      if (hasLevelData && exercise.category_id) {
        const userLevel = levelMap.get(exercise.category_id)
        if (userLevel === undefined) return false
        if (userLevel < exercise.min_level || userLevel > exercise.max_level) return false
      }

      return true
    })

    if (categoryFilter) return filtered

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

  function filterWarmupCooldown(exercises: ReturnType<typeof filterExercises>, selectedBodyRegions: Set<string>) {
    return exercises.filter((e: any) => {
      const blockSlugs = (e.exercise_blocks as any[])?.map((b: any) => b.block_types?.slug) ?? []
      if (!blockSlugs.includes("warmup") && !blockSlugs.includes("cooldown")) return false
      if (!e.body_region || e.body_region === "full_body") return true
      return selectedBodyRegions.has(e.body_region)
    })
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



  // ── 4. Week planner call ─────────────────────────────────────

  const userContext = JSON.stringify({
    sport_slug,
    load_profile,
    load_score,
    ...(weekly_schedule.sessions.length > 0 ? { weekly_schedule } : {}),
    user_environments: environment_slugs,
    sport_required_categories,
    user_focus_categories,
  }, null, 2)

  // Exercise pool for the week planner: base-filtered + only main block exercises (no warmup/cooldown-only)
  const allBaseExercises = filterExercises("full") // most permissive mode to get full pool
  const weekPlannerPool = allBaseExercises.filter((e: any) => {
    const blockSlugs = (e.exercise_blocks as any[])?.map((b: any) => b.block_types?.slug) ?? []
    return blockSlugs.some((s: string) => ["primary", "secondary", "accessory"].includes(s))
  })

  const weekPlanCompletion = await openai.chat.completions.create({
    model: "gpt-5.2", // full model — plans the entire week structure and picks all exercises
    messages: [{
      role: "system",
      content: GENERATE_WEEK_PLAN_PROMPT({
        sessions: sessionSpecs.map((s) => ({
          ...s,
          ...targetDuration(s.mode_slug, min_session_duration, max_session_duration),
        })),
        exercisesString: exercisesToString(weekPlannerPool),
        exerciseSlugs: weekPlannerPool.map((e: any) => e.slug).join("\n"),
        userContext,
        categorySlugs,
      }),
    }],
    response_format: zodResponseFormat(weekPlanSchema, "data"),
    max_completion_tokens: 2000,
  })

  const weekPlanChoice = weekPlanCompletion.choices[0]
  if (weekPlanChoice.finish_reason === "length") throw new Error("Week plan was cut off.")
  const weekPlan = JSON.parse(weekPlanChoice.message.content!) as z.infer<typeof weekPlanSchema>

  console.log("week plan", JSON.stringify(weekPlan, null, 2))

  // Build lookup: day_of_week → pre-decided blocks
  const sessionPlanMap = new Map(weekPlan.sessions.map((s) => [s.day_of_week, s.blocks]))

  // Build week plan summary text for Phase B prompts
  const DAY_NAMES: Record<number, string> = {
    1: "Montag", 2: "Dienstag", 3: "Mittwoch", 4: "Donnerstag",
    5: "Freitag", 6: "Samstag", 7: "Sonntag",
  }
  const weekPlanSummary = weekPlan.sessions.map((s) => {
    const blocksText = s.blocks.map((b) =>
      `${b.block_type}=${b.category_slug} (${b.exercise_slugs.join(", ")})`
    ).join(", ")
    const spec = sessionSpecs.find((sp) => sp.day_of_week === s.day_of_week)
    return `- ${DAY_NAMES[s.day_of_week] ?? `Tag ${s.day_of_week}`} [${spec?.mode_slug ?? "?"}]: ${blocksText || "keine Hauptblöcke"}`
  }).join("\n")



  // ── 5. Prepare Phase B inputs for each session ───────────────

  type SessionInput = {
    spec: { day_of_week: number; mode_slug: SessionModeSlug }
    duration: { min: number; max: number }
    preDecided: { blocks: z.infer<typeof weekPlanSchema>["sessions"][number]["blocks"]; selectedBodyRegions: string[] } | undefined
    mainPool: ReturnType<typeof filterExercises>
    warmupCooldownPool: ReturnType<typeof filterExercises>
    otherSessionSlugs: string[]
  }

  const sessionInputs: SessionInput[] = sessionSpecs.map((spec) => {
    const duration = targetDuration(spec.mode_slug, min_session_duration, max_session_duration)
    const preDecidedBlocks = sessionPlanMap.get(spec.day_of_week) ?? []

    // Validate slugs from week plan against the actual pool
    const weekPlannerSlugSet = new Set(weekPlannerPool.map((e: any) => e.slug))
    const validatedBlocks = preDecidedBlocks.map((block) => ({
      ...block,
      exercise_slugs: block.exercise_slugs.filter((slug) => {
        const valid = weekPlannerSlugSet.has(slug)
        if (!valid) console.warn(`Week plan returned unknown slug "${slug}" for block ${block.block_type} on day ${spec.day_of_week} — discarding`)
        return valid
      }),
    })).filter((block) => block.exercise_slugs.length > 0)

    // Extract body regions from pre-decided exercises
    const selectedBodyRegions = new Set<string>()
    for (const block of validatedBlocks) {
      for (const slug of block.exercise_slugs) {
        const exercise = exerciseBySlug.get(slug)
        if (exercise?.body_region && exercise.body_region !== "full_body") {
          selectedBodyRegions.add(exercise.body_region)
        }
      }
    }

    // Mode-filtered exercise pool for this session
    const mainPool = filterExercises(spec.mode_slug)

    // Warmup/cooldown pool filtered by exact body regions
    const warmupCooldownPool = validatedBlocks.length > 0
      ? filterWarmupCooldown(mainPool, selectedBodyRegions)
      : mainPool.filter((e: any) => {
          const blockSlugs = (e.exercise_blocks as any[])?.map((b: any) => b.block_types?.slug) ?? []
          return blockSlugs.includes("warmup") || blockSlugs.includes("cooldown")
        })

    // Slugs used in other sessions (hard exclusion for Phase B)
    const otherSessionSlugs = weekPlan.sessions
      .filter((s) => s.day_of_week !== spec.day_of_week)
      .flatMap((s) => s.blocks.flatMap((b) => b.exercise_slugs))

    const preDecided = validatedBlocks.length > 0
      ? { blocks: validatedBlocks, selectedBodyRegions: [...selectedBodyRegions] }
      : undefined

    console.log(`Session day ${spec.day_of_week} [${spec.mode_slug}]: ${validatedBlocks.length} pre-decided blocks, ${warmupCooldownPool.length} warmup/cooldown exercises`)

    return { spec, duration, preDecided, mainPool, warmupCooldownPool, otherSessionSlugs }
  })



  // ── 6. Generate all sessions in parallel ─────────────────────

  const sessionResults = await Promise.allSettled(
    sessionInputs.map((si, i) => {
      const warmupCooldownExercisesString = si.warmupCooldownPool.length > 0
        ? exercisesToString(si.warmupCooldownPool)
        : undefined
      const warmupCooldownSlugs = si.warmupCooldownPool.length > 0
        ? si.warmupCooldownPool.map((e: any) => e.slug).join("\n")
        : undefined

      return openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [{
          role: "system",
          content: GENERATE_SESSION_PROMPT({
            sessionIndex: i,
            totalSessions: sessionSpecs.length,
            spec: si.spec,
            duration: si.duration,
            exercisesString: exercisesToString(si.mainPool),
            exerciseSlugs: si.mainPool.map((e: any) => e.slug).join("\n"),
            warmupCooldownExercisesString,
            warmupCooldownSlugs,
            preDecided: si.preDecided,
            otherSessionSlugs: si.otherSessionSlugs,
            weekPlanSummary,
            userContext,
            planName: weekPlan.name,
            planDescription: weekPlan.description,
          }),
        }],
        response_format: zodResponseFormat(sessionSchema, "data"),
        max_completion_tokens: 8000,
      })
    })
  )



  // ── 7. Process results ───────────────────────────────────────

  const BLOCK_ORDER: Record<string, number> = {
    warmup: 0, primary: 1, secondary: 2, accessory: 3, cooldown: 4,
  }

  const plannedSessions: z.infer<typeof sessionSchema>[] = []

  for (let i = 0; i < sessionResults.length; i++) {
    const result = sessionResults[i]
    const spec = sessionSpecs[i]

    if (result.status === "rejected") {
      console.warn(`Session ${i + 1} (day ${spec.day_of_week}) failed: ${result.reason}`)
      continue
    }

    const choice = result.value.choices[0]
    if (choice.finish_reason === "length") {
      console.warn(`Session ${i + 1} (day ${spec.day_of_week}) was cut off — skipping.`)
      continue
    }

    const session = JSON.parse(choice.message.content!) as z.infer<typeof sessionSchema>
    if (!session) continue

    session.day_of_week = spec.day_of_week
    session.mode_slug = spec.mode_slug
    session.order_index = i

    session.blocks.sort((a, b) => (BLOCK_ORDER[a.block_type] ?? 99) - (BLOCK_ORDER[b.block_type] ?? 99))
    session.blocks.forEach((b, idx) => { b.order_index = idx })

    plannedSessions.push(session)
  }

  return {
    name: weekPlan.name,
    description: weekPlan.description,
    sessions: plannedSessions,
  }
}
