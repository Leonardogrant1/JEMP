import { SupabaseClient } from "@supabase/supabase-js"
import { OpenAI } from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"
import { GENERATE_MAIN_BLOCKS_PROMPT, GENERATE_WARMUP_COOLDOWN_PROMPT, GENERATE_WEEK_PLAN_PROMPT } from "./prompts.ts"
import { mainSessionSchema, sessionSchema, warmupCooldownSchema, weekPlanSchema } from "./schemas.ts"
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

  const t0 = Date.now()
  const elapsed = (since: number) => `${((Date.now() - since) / 1000).toFixed(1)}s`

  // ── 1. Determine session modes ───────────────────────────────

  const sessionSpecs = determineSessionModes(preferred_workout_days, weekly_schedule, load_profile)

  if (sessionSpecs.length === 0) {
    throw new Error("No sessions to generate — preferred_workout_days resulted in zero sessions after mode determination.")
  }

  // ── 2. Fetch exercise data ───────────────────────────────────

  const tDb = Date.now()
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

  const exerciseBySlug = new Map<string, any>()
  for (const e of allExercises ?? []) exerciseBySlug.set(e.slug, e)



  // ── 3. Exercise filter helpers ───────────────────────────────

  function passesEquipmentAndEnv(exercise: any): boolean {
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
  }

  // Phase B: filter exercises by block_type relation + mode intensity/type constraints.
  // category_slug is NOT a hard filter — it's passed as context to the KI in Phase C.
  // This prevents empty pools when the DB has no exact category+block_type intersection.
  function filterByBlockTypeForMode(
    blockType: "primary" | "secondary" | "accessory",
    forMode: SessionModeSlug,
  ): any[] {
    return (allExercises ?? []).filter((exercise) => {
      // Must have exercise_blocks relation to this block_type
      const blockSlugs = (exercise.exercise_blocks as any[])?.map((b: any) => b.block_types?.slug) ?? []
      if (!blockSlugs.includes(blockType)) return false

      // Apply mode intensity/type constraints
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

      return passesEquipmentAndEnv(exercise)
    })
  }

  // Phase D: filter exercises by warmup/cooldown block_type relation (no intensity/type filter)
  function filterByBlockType(blockType: "warmup" | "cooldown"): any[] {
    return (allExercises ?? []).filter((exercise) => {
      const blockSlugs = (exercise.exercise_blocks as any[])?.map((b: any) => b.block_types?.slug) ?? []
      if (!blockSlugs.includes(blockType)) return false

      return passesEquipmentAndEnv(exercise)
    })
  }

  function filterByBodyRegion(exercises: any[], bodyRegions: Set<string>): any[] {
    if (bodyRegions.size === 0) return exercises
    return exercises.filter((e: any) =>
      !e.body_region || e.body_region === "full_body" || bodyRegions.has(e.body_region)
    )
  }

  function exercisesToString(exercises: any[]): string {
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



  // ── 4. Phase A: Week planner — KI picks categories per block ──

  const userContext = JSON.stringify({
    sport_slug,
    load_profile,
    load_score,
    ...(weekly_schedule.sessions.length > 0 ? { weekly_schedule } : {}),
    user_environments: environment_slugs,
    sport_required_categories,
    user_focus_categories,
  }, null, 2)

  const tPhaseA = Date.now()
  console.log(`[t=${elapsed(t0)}] Phase A — calling week planner: ${sessionSpecs.length} sessions, categorySlugs=[${categorySlugs.join(", ")}]`)

  const weekPlanCompletion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [{
      role: "system",
      content: GENERATE_WEEK_PLAN_PROMPT({
        sessions: sessionSpecs.map((s) => ({
          ...s,
          ...targetDuration(s.mode_slug, min_session_duration, max_session_duration),
        })),
        userContext,
        categorySlugs,
      }),
    }],
    reasoning_effort: "low",
    response_format: zodResponseFormat(weekPlanSchema, "data"),
    max_completion_tokens: 4000,
  })

  const weekPlanChoice = weekPlanCompletion.choices[0]
  console.log(`[t=${elapsed(t0)}] Phase A done (${elapsed(tPhaseA)}) — finish_reason=${weekPlanChoice.finish_reason}, tokens=${weekPlanCompletion.usage?.completion_tokens}`)
  if (weekPlanChoice.finish_reason === "length") throw new Error("Week plan was cut off.")
  const weekPlan = JSON.parse(weekPlanChoice.message.content!) as z.infer<typeof weekPlanSchema>

  console.log("Phase A — week plan:", JSON.stringify(weekPlan, null, 2))

  const DAY_NAMES: Record<number, string> = {
    1: "Montag", 2: "Dienstag", 3: "Mittwoch", 4: "Donnerstag",
    5: "Freitag", 6: "Samstag", 7: "Sonntag",
  }

  const weekPlanSummary = weekPlan.sessions.map((s) => {
    const blocksText = s.blocks.map((b) => `${b.block_type}=${b.category_slug}`).join(", ")
    const spec = sessionSpecs.find((sp) => sp.day_of_week === s.day_of_week)
    return `- ${DAY_NAMES[s.day_of_week] ?? `Tag ${s.day_of_week}`} [${spec?.mode_slug ?? "?"}]: ${blocksText || "keine Hauptblöcke"}`
  }).join("\n")



  // ── 5. Phase B: Code builds all exercise pools per session ───
  // Main block pools: filtered by exercise_blocks relation + mode
  // Warmup/cooldown pools: filtered by exercise_blocks relation + body_regions from Phase A

  type BlockPool = {
    block_type: "primary" | "secondary" | "accessory"
    category_slug: string
    exercisesString: string
    slugs: string
  }

  type SessionBuildInput = {
    spec: { day_of_week: number; mode_slug: SessionModeSlug }
    duration: { min: number; max: number }
    blockPools: BlockPool[]
    bodyRegions: string[]
    warmupExercisesString: string
    warmupSlugs: string
    warmupCategorySlugs: string[]
    cooldownExercisesString: string
    cooldownSlugs: string
    cooldownCategorySlugs: string[]
  }

  const allWarmupExercises = filterByBlockType("warmup")
  const allCooldownExercises = filterByBlockType("cooldown")
  console.log(`Warmup/cooldown pools: warmup=${allWarmupExercises.length}, cooldown=${allCooldownExercises.length}`)

  const sessionBuildInputs: SessionBuildInput[] = sessionSpecs.map((spec) => {
    const duration = targetDuration(spec.mode_slug, min_session_duration, max_session_duration)
    const weekPlanSession = weekPlan.sessions.find((s) => s.day_of_week === spec.day_of_week)
    const plannedBlocks = weekPlanSession?.blocks ?? []
    const sessionBodyRegions = new Set(weekPlanSession?.body_regions ?? [])

    const blockPools: BlockPool[] = plannedBlocks.map((block) => {
      const pool = filterByBlockTypeForMode(block.block_type, spec.mode_slug)
      console.log(`Phase B day ${spec.day_of_week} [${spec.mode_slug}] ${block.block_type}/${block.category_slug}: ${pool.length} exercises`)
      return {
        block_type: block.block_type,
        category_slug: block.category_slug,
        exercisesString: exercisesToString(pool),
        slugs: pool.map((e: any) => e.slug).join(", "),
      }
    })

    const warmupPool = (() => {
      const filtered = filterByBodyRegion(allWarmupExercises, sessionBodyRegions)
      return filtered.length > 0 ? filtered : allWarmupExercises
    })()
    const cooldownPool = (() => {
      const filtered = filterByBodyRegion(allCooldownExercises, sessionBodyRegions)
      return filtered.length > 0 ? filtered : allCooldownExercises
    })()

    console.log(`Phase B day ${spec.day_of_week}: bodyRegions=[${[...sessionBodyRegions].join(",")}], warmup=${warmupPool.length}, cooldown=${cooldownPool.length}`)

    const uniqueSlugs = (pool: any[]) => [...new Set(pool.map((e: any) => e.categories?.slug).filter(Boolean))]

    return {
      spec,
      duration,
      blockPools,
      bodyRegions: [...sessionBodyRegions],
      warmupExercisesString: exercisesToString(warmupPool),
      warmupSlugs: warmupPool.map((e: any) => e.slug).join(", "),
      warmupCategorySlugs: uniqueSlugs(warmupPool),
      cooldownExercisesString: exercisesToString(cooldownPool),
      cooldownSlugs: cooldownPool.map((e: any) => e.slug).join(", "),
      cooldownCategorySlugs: uniqueSlugs(cooldownPool),
    }
  })



  // ── 6. Phase C: One call per session — main blocks + warmup + cooldown ───────

  const BLOCK_ORDER: Record<string, number> = {
    warmup: 0, primary: 1, secondary: 2, accessory: 3, cooldown: 4,
  }

  const tPhaseC = Date.now()
  console.log(`[t=${elapsed(t0)}] Phase B done — Phase C+D starting ${sessionBuildInputs.length} sessions in parallel`)

  const sessionResults = await Promise.allSettled(
    sessionBuildInputs.map(async (si, i): Promise<z.infer<typeof sessionSchema>> => {
      console.log(`Phase C Session ${i + 1} (day ${si.spec.day_of_week} [${si.spec.mode_slug}]): mainPools=${si.blockPools.length}, warmup=${si.warmupSlugs.split(",").length}, cooldown=${si.cooldownSlugs.split(",").length}`)

      // ── Phase C: main blocks ──────────────────────────────────
      const tC = Date.now()
      const mainCompletion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [{
          role: "system",
          content: GENERATE_MAIN_BLOCKS_PROMPT({
            sessionIndex: i,
            totalSessions: sessionSpecs.length,
            spec: si.spec,
            duration: si.duration,
            blockPools: si.blockPools,
            weekPlanSummary,
            userContext,
            planName: weekPlan.name,
            planDescription: weekPlan.description,
          }),
        }],
        response_format: zodResponseFormat(mainSessionSchema, "data"),
        max_completion_tokens: 5000,
      })

      const mainChoice = mainCompletion.choices[0]
      console.log(`Phase C Session ${i + 1} (day ${si.spec.day_of_week}): finish_reason=${mainChoice.finish_reason}, tokens=${mainCompletion.usage?.completion_tokens} (${elapsed(tC)})`)
      if (mainChoice.finish_reason === "length") {
        throw new Error(`Phase C Session ${i + 1} (day ${si.spec.day_of_week}) cut off`)
      }
      const mainSession = JSON.parse(mainChoice.message.content!) as z.infer<typeof mainSessionSchema>
      console.log(`Phase C Session ${i + 1} (day ${si.spec.day_of_week}): ${mainSession.blocks.length} blocks — ${mainSession.blocks.map(b => `${b.block_type}(${b.exercises.length})`).join(", ")}`)
      mainSession.day_of_week = si.spec.day_of_week
      mainSession.mode_slug = si.spec.mode_slug
      mainSession.order_index = i

      // ── Phase D: warmup + cooldown (pools already ready from Phase B) ─────
      const tD = Date.now()
      const mainBlocksSummary = mainSession.blocks.map((b) =>
        `${b.block_type} (${b.focused_category_slug}): ${b.exercises.map((e) => e.exercise_slug).join(", ")}`
      ).join("\n")
      const mainBlocksSlugs = mainSession.blocks.flatMap((b) => b.exercises.map((e) => e.exercise_slug))

      const wcCompletion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        reasoning_effort: "low",
        messages: [{
          role: "system",
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
        response_format: zodResponseFormat(warmupCooldownSchema, "data"),
        max_completion_tokens: 3000,
      })

      const wcChoice = wcCompletion.choices[0]
      console.log(`Phase D Session ${i + 1} (day ${si.spec.day_of_week}): finish_reason=${wcChoice.finish_reason}, tokens=${wcCompletion.usage?.completion_tokens} (${elapsed(tD)})`)

      const wcBlocks: z.infer<typeof warmupCooldownSchema>["blocks"] = []
      if (wcChoice.finish_reason !== "length" && wcChoice.message.content) {
        try {
          const parsed = JSON.parse(wcChoice.message.content) as z.infer<typeof warmupCooldownSchema>
          wcBlocks.push(...parsed.blocks)
        } catch (err) {
          console.error(`Phase D Session ${i + 1}: JSON parse error: ${err}`)
        }
      }

      // ── Merge C + D ───────────────────────────────────────────
      const allBlocks = [...mainSession.blocks, ...wcBlocks]
      allBlocks.sort((a, b) => (BLOCK_ORDER[a.block_type] ?? 99) - (BLOCK_ORDER[b.block_type] ?? 99))
      allBlocks.forEach((b, idx) => { b.order_index = idx })

      return { ...mainSession, blocks: allBlocks }
    })
  )



  // ── 7. Collect results ────────────────────────────────────────

  console.log(`[t=${elapsed(t0)}] Phase C done (${elapsed(tPhaseC)})`)

  const plannedSessions: z.infer<typeof sessionSchema>[] = []

  for (let i = 0; i < sessionResults.length; i++) {
    const result = sessionResults[i]
    const spec = sessionSpecs[i]
    if (result.status === "rejected") {
      console.warn(`Session ${i + 1} (day ${spec.day_of_week}) failed: ${result.reason}`)
      continue
    }
    plannedSessions.push(result.value)
  }

  console.log(`[t=${elapsed(t0)}] Done — ${plannedSessions.length} sessions`)

  return {
    name: weekPlan.name,
    description: weekPlan.description,
    sessions: plannedSessions,
  }
}
