// Deterministic week-layout engine (spec §2.1, §2.9). Pure: no IO, no Date.
// Wired into the pipeline in Phase 2b behind the set_by_wizard gate.
// ⚠️ SYNC MIRROR: lib/week-allocation.ts (App) spiegelt allocateDays/
// effectiveSpeedLevel/Caps für die Tage-Step-Zusammensetzung — beide ändern!

/** Forward distance in days from `from` to `to` on the circular week (1=Mon..7=Sun). */
export function circularDayDistance(from: number, to: number): number {
  return ((to - from) % 7 + 7) % 7
}

import type { WeeklySchedule } from './types'
import { WORKOUT_DAY_CAP, MIN_WORKOUT_DAYS, WORKOUT_BLOCK_SEQUENCE, BLOCK_MINUTES, blockMinutes, MAINTENANCE_DOSE_FACTOR, COMPACT_SESSION_THRESHOLD_MINUTES, INTEGRATED_SPRINT_BLOCK_MINUTES, CONDITIONING_FINISHER_MINUTES, DROP_PRIORITY, BLOCK_TO_PILLAR } from './week-layout-constants'
import { composeWeek } from './v2/composition'

export type NewSessionType = 'training' | 'speed' | 'mobility' | 'conditioning'
export type PillarSlug =
  | 'strength' | 'lower_body_plyometrics' | 'upper_body_plyometrics'
  | 'sprints' | 'cod' | 'conditioning' | 'mobility'
export type PillarLevels = Partial<Record<PillarSlug, 1 | 2 | 3>>

export type WeekLayoutInput = {
  available_days: number[]
  weekly_schedule: WeeklySchedule
  load_profile: 'low' | 'medium' | 'high'
  pillar_levels: PillarLevels
  sprints_covered_by_club: boolean
  /** Global preferred session duration (minutes); per-day overrides win. */
  session_minutes: number
  day_minutes?: Array<{ day_of_week: number; minutes: number }>
  /** Tage, deren Umgebung echte Sprints erlaubt (Outdoor oder keine Tages-
   *  Umgebung gesetzt). Fehlt das Feld, gelten alle Tage als sprinttauglich.
   *  Weiche Präferenz: 72h-Regel und Legalität gewinnen immer. */
}

export type SpeedCarrier = 'standalone' | 'integrated' | 'micro' | 'none'
export type DayAllocation = {
  workouts: number
  speed_days: number
  conditioning_day: boolean
  mobility_day: boolean
  carrier: SpeedCarrier
}

/** max(sprint level, cod level); club sprint training damps sprints to 1, never cod (spec §2.1a). */
export function effectiveSpeedLevel(pillars: PillarLevels, sprintsCoveredByClub: boolean): 0 | 1 | 2 | 3 {
  const sprint = Math.min(pillars.sprints ?? 0, sprintsCoveredByClub ? 1 : 3)
  return Math.max(sprint, pillars.cod ?? 0) as 0 | 1 | 2 | 3
}

export function allocateDays(input: WeekLayoutInput): DayAllocation {
  const cap = WORKOUT_DAY_CAP[input.load_profile]
  const days = input.available_days.length
  let workouts = Math.min(cap, days)
  let spare = days - workouts

  const speedLevel = effectiveSpeedLevel(input.pillar_levels, input.sprints_covered_by_club)
  let speedDays = 0
  let carrier: SpeedCarrier = speedLevel === 0 ? 'none' : 'micro'

  // Sprints immer standalone (QA 09.10.): ist kein eigener Tag frei, bleibt es
  // bei der CNS-Mikro-Dosis im Warmup — nie ein integrierter Sprint-Block in
  // einer Workout-Session.
  if (speedLevel === 3) {
    if (workouts - 1 >= MIN_WORKOUT_DAYS) {
      workouts -= 1
      spare += 1
    }
    if (spare > 0) { speedDays = 1; spare -= 1; carrier = 'standalone' }
    else carrier = 'micro' // 2-day edge case: keine Standalone möglich → Mikro-Dosis
    if (carrier === 'standalone' && spare > 0) { speedDays += 1; spare -= 1 } // second day: surplus only
  } else if (speedLevel === 2) {
    if (spare > 0) { speedDays = 1; spare -= 1; carrier = 'standalone' }
    else carrier = 'micro'
  }

  // Conditioning own day (damping §2.2): level 2 only at low weekly load;
  // level 3 is a deliberate signal (e.g. combat-sport preset) and PIERCES the
  // damping at any load. Speed drew its surplus days first — speed wins the
  // shared spare day, conditioning falls back to the finisher.
  const conditioningLevel = input.pillar_levels.conditioning ?? 0
  let conditioningDay = false
  if (spare > 0 && (conditioningLevel === 3 || (conditioningLevel === 2 && input.load_profile === 'low'))) {
    conditioningDay = true
    spare -= 1
  }

  // Mobility floats on rest days — no cost against available_days (fatigue 0).
  const mobilityDay = (input.pillar_levels.mobility ?? 0) >= 2

  return { workouts, speed_days: speedDays, conditioning_day: conditioningDay, mobility_day: mobilityDay, carrier }
}

export type PlacedDay = {
  day_of_week: number
  session_type: NewSessionType
  minutes: number
  dose: 'normal' | 'maintenance'
  carries_sprint_block: boolean
  /** Conditioning finisher (~10 min interval block at the end) — the integrated
   *  carrier when conditioning level >= 2 has no own day (spec §2.1a fallback). */
  carries_conditioning_finisher: boolean
  heavy_lower: boolean
  suppress_micro_dose: boolean
  /** Flexible-Window (Spec 2026-10-09): erlaubte Wochentage für die flexible
   *  Ausführung; day_of_week bleibt die Empfehlung. undefined = fest gepinnt. */
  flexible_window?: number[]
}
export type WeekPlacement = { days: PlacedDay[]; carrier: SpeedCarrier; notes: string[] }

function minutesFor(input: WeekLayoutInput, day: number): number {
  return input.day_minutes?.find((d) => d.day_of_week === day)?.minutes ?? input.session_minutes
}

/** Min circular distance in either direction (for "far from X" scoring). */
function symmetricDistance(a: number, b: number): number {
  const f = circularDayDistance(a, b)
  return Math.min(f, 7 - f)
}

export function placeWeek(input: WeekLayoutInput, allocation: DayAllocation): WeekPlacement {
  const notes: string[] = []
  const gameDays = input.weekly_schedule.sessions
    .filter((s) => s.type === 'game' || s.type === 'tournament')
    .map((s) => s.day_of_week)
  const gameWeek = gameDays.length > 0

  // Forward distance to the next game (what "days until the game" means for
  // pre-game protection). Infinity without games.
  const gameFwd = (day: number) =>
    gameDays.length === 0 ? Infinity : Math.min(...gameDays.map((g) => circularDayDistance(day, g)))
  const dayAfterGame = (day: number) => gameDays.some((g) => circularDayDistance(g, day) === 1)

  // Speed legality (hard): never <72h (3 days) before a game, never on one.
  // The day after a game is only a soft penalty — if it is the sole legal
  // window, it is used with a note (72h protection outranks post-game comfort).
  const speedLegal = (day: number) => gameFwd(day) >= 3 && !gameDays.includes(day)

  let carrier = allocation.carrier
  let speedDayCount = allocation.speed_days
  // Sanitize: game/tournament days are never schedulable, even if the user
  // left them toggled "available" (review C2 — heavy squats on match day).
  const pool = [...input.available_days].filter((d) => !gameDays.includes(d)).sort((a, b) => a - b)
  for (const d of input.available_days) if (gameDays.includes(d)) {
    notes.push(`Tag ${d} ist Spiel-/Turniertag — aus den Trainingstagen entfernt`)
  }

  // 1. Speed days: legal days; avoid post-game days, then shortest minutes
  // first. (Sprint-Env-Fix 09.10.: die Session ist immer outdoor — eine
  // "sprinttaugliche" Tages-Umgebung gibt es nicht mehr als Kriterium.)
  const speedDays: number[] = []
  if (speedDayCount > 0) {
    const legal = pool.filter(speedLegal).sort((a, b) =>
      (dayAfterGame(a) ? 1 : 0) - (dayAfterGame(b) ? 1 : 0) ||
      minutesFor(input, a) - minutesFor(input, b) || a - b)
    while (speedDayCount > 0 && legal.length > 0) {
      const d = legal.shift()!
      speedDays.push(d)
      if (dayAfterGame(d)) notes.push(`Speed: Tag ${d} liegt direkt nach einem Spiel — einziges legales Fenster`)
      pool.splice(pool.indexOf(d), 1)
      speedDayCount -= 1
    }
    if (speedDays.length === 0) {
      // Sprints bleiben standalone — kein legales Fenster → nur Mikro-Dosis (QA 09.10.)
      carrier = 'micro'
      notes.push('Speed: kein legales Fenster (72h-Regel) — Standalone zu micro degradiert')
    } else if (speedDayCount > 0) {
      notes.push(`Speed: ${speedDayCount} reservierte(r) Speed-Tag(e) ohne legales Fenster — Tag bleibt frei`)
    }
  }

  // 2. Conditioning day: never the day before a game; prefer a short day.
  let conditioningDay: number | null = null
  if (allocation.conditioning_day) {
    const legal = pool.filter((d) => gameDays.every((g) => circularDayDistance(d, g) !== 1))
      .sort((a, b) => minutesFor(input, a) - minutesFor(input, b) || a - b)
    if (legal.length > 0) { conditioningDay = legal[0]; pool.splice(pool.indexOf(legal[0]), 1) }
    else notes.push('Conditioning: kein legaler Tag (Spieltag-Nähe) — entfällt diese Woche')
  }

  // Workout-cap guard (review C1): leftover reserved days — unplaceable speed
  // days, stripped game days etc. — must become REST, never extra workouts.
  while (pool.length > allocation.workouts) {
    const freed = pool.pop()!
    notes.push(`Tag ${freed} bleibt frei — Workout-Cap (${allocation.workouts}) erreicht`)
  }

  // 3. Remaining pool = training days. Heavy lower: ≥72h before the game
  //    (hard, falls back if impossible), far from the speed day (48h,
  //    symmetric), prefer long days. "Game-farthest" uses forward distance —
  //    the protection is about days UNTIL the game, not days since it.
  const trainingDays = pool
  const speedFar = (d: number) => speedDays.length === 0 ? 0 : Math.min(...speedDays.map((s) => symmetricDistance(d, s)))
  // Finite game distance for sort arithmetic (Infinity - Infinity = NaN).
  const gameFwdFinite = (d: number) => gameDays.length === 0 ? 7 : gameFwd(d)
  const afterPenalty = (d: number) => (dayAfterGame(d) ? 1 : 0)
  let heavyCandidates = trainingDays.filter((d) => gameFwd(d) >= 3)
  const heavyFallback = heavyCandidates.length === 0 && trainingDays.length > 0
  if (heavyCandidates.length === 0) heavyCandidates = [...trainingDays]
  heavyCandidates.sort((a, b) =>
    afterPenalty(a) - afterPenalty(b) ||
    (speedDays.length > 0 ? speedFar(b) - speedFar(a) : gameFwdFinite(b) - gameFwdFinite(a)) ||
    minutesFor(input, b) - minutesFor(input, a) || a - b)
  // 48h guard against the speed day; integrated carrier shares its day by design.
  const heavyDay = heavyCandidates.find((d) => speedDays.every((s) => symmetricDistance(d, s) >= 2)) ?? heavyCandidates[0] ?? null
  if (heavyDay !== null && speedDays.some((s) => symmetricDistance(heavyDay, s) < 2)) {
    notes.push('Heavy-Lower: 48h-Abstand zum Speed-Tag nicht einhaltbar — geringste Regelabweichung gewählt')
  }
  if (heavyFallback && heavyDay !== null) {
    notes.push(`Heavy-Lower: kein Tag ≥72h vor dem Spiel verfügbar — Kompromiss auf Tag ${heavyDay}`)
  }
  if (heavyDay !== null && dayAfterGame(heavyDay)) {
    notes.push(`Heavy-Lower: Tag ${heavyDay} liegt direkt nach einem Spiel — einzige Option`)
  }
  // 3b. Conditioning finisher day (spec §2.1a fallback "finisher-scale content"):
  //     conditioning level >= 2 without an own day, damped away at high load
  //     (§2.2 — club training covers it). Never on the sprint-carrier day
  //     (§3.3: speed + conditioning never share a day), never the day before
  //     a game. Prefers the game-farthest, longest training day.
  let finisherDay: number | null = null
  const conditioningLevel = input.pillar_levels.conditioning ?? 0
  const finisherAllowed = conditioningLevel === 3 || (conditioningLevel === 2 && input.load_profile !== 'high')
  if (!allocation.conditioning_day && finisherAllowed) {
    const candidates = trainingDays
      .filter((d) => gameDays.every((g) => circularDayDistance(d, g) !== 1))
      .sort((a, b) => gameFwdFinite(b) - gameFwdFinite(a) || minutesFor(input, b) - minutesFor(input, a) || a - b)
    finisherDay = candidates[0] ?? null
    if (finisherDay === null) notes.push('Conditioning: kein geeigneter Finisher-Tag — entfällt diese Woche')
  }

  // 4. Mobility day: a true rest day (no available/club/game day); fallback: lowest-intensity club day.
  let mobilityDay: number | null = null
  if (allocation.mobility_day) {
    const busy = new Set([...input.available_days, ...input.weekly_schedule.sessions.map((s) => s.day_of_week)])
    const rest = [1, 2, 3, 4, 5, 6, 7].filter((d) => !busy.has(d))
    if (rest.length > 0) mobilityDay = rest[0]
    else {
      const club = input.weekly_schedule.sessions
        .filter((s) => s.type === 'team_training' || s.type === 'individual_training')
        .sort((a, b) => a.intensity - b.intensity)
      mobilityDay = club[0]?.day_of_week ?? null
      // Last resort: mobility stacks on any training day (fatigue 0 — evening
      // slot, spec §3.3.1). An allocated mobility session must never vanish.
      if (mobilityDay === null && trainingDays.length > 0) mobilityDay = trainingDays[0]
      if (mobilityDay !== null) notes.push(`Mobility: kein Ruhetag frei — auf Tag ${mobilityDay} gestapelt (Abend-Slot)`)
    }
  }

  // Flexible-Window (Spec 2026-10-09): Speed darf an jedem legalen Wochentag
  // ausgeführt werden (72h-/Spieltags-Regel über alle 7 Tage, nicht nur die
  // gewählten); Mobility jederzeit. day_of_week bleibt die Empfehlung.
  const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]
  const speedWindow = ALL_DAYS.filter(speedLegal)

  const days: PlacedDay[] = []
  for (const d of speedDays) days.push({
    day_of_week: d, session_type: 'speed', minutes: Math.min(minutesFor(input, d), 40),
    dose: gameWeek ? 'maintenance' : 'normal',
    carries_sprint_block: false, carries_conditioning_finisher: false, heavy_lower: false, suppress_micro_dose: false,
    flexible_window: speedWindow,
  })
  if (conditioningDay !== null) days.push({
    day_of_week: conditioningDay, session_type: 'conditioning', minutes: minutesFor(input, conditioningDay),
    dose: 'normal', carries_sprint_block: false, carries_conditioning_finisher: false, heavy_lower: false, suppress_micro_dose: false,
  })
  for (const d of trainingDays) days.push({
    day_of_week: d, session_type: 'training', minutes: minutesFor(input, d), dose: 'normal',
    carries_sprint_block: false,
    carries_conditioning_finisher: d === finisherDay,
    heavy_lower: d === heavyDay,
    suppress_micro_dose: speedDays.some((s) => circularDayDistance(s, d) === 1),
  })
  if (mobilityDay !== null) days.push({
    day_of_week: mobilityDay, session_type: 'mobility', minutes: 20, dose: 'normal',
    carries_sprint_block: false, carries_conditioning_finisher: false, heavy_lower: false, suppress_micro_dose: false,
    flexible_window: ALL_DAYS,
  })

  days.sort((a, b) => a.day_of_week - b.day_of_week)
  return { days, carrier, notes }
}

export type WorkoutBlockType =
  | 'warmup' | 'push' | 'pull' | 'lower_body' | 'lower_strength' | 'upper_strength'
  | 'core' | 'conditioning' | 'plyo' | 'accessory' | 'optional' | 'cooldown' | 'rotation'
/** Pattern-Anforderung eines Kraftblocks (Spec 2026-10-10 §1.2) — Generator-
 *  intern, nicht persistiert. */
export type BlockPattern = { pattern: string; emphasis: 'heavy' | 'normal' }

export type PlannedWorkoutBlock = {
  block_type: WorkoutBlockType
  variant: string | null
  emphasis: 'heavy' | 'normal' | 'light'
  patterns?: BlockPattern[]
}

export function planWorkoutBlocks(placement: WeekPlacement): Map<number, PlannedWorkoutBlock[]> {
  const trainingDays = placement.days.filter((d) => d.session_type === 'training')
  const result = new Map<number, PlannedWorkoutBlock[]>()

  trainingDays.forEach((day, i) => {
    const blocks: PlannedWorkoutBlock[] = WORKOUT_BLOCK_SEQUENCE.map((bt) => {
      let variant: string | null = null
      let emphasis: 'heavy' | 'normal' | 'light' = 'normal'
      switch (bt) {
        case 'push': variant = i % 2 === 0 ? 'push_vertical' : 'push_horizontal'; break
        case 'pull': variant = i % 2 === 0 ? 'pull_horizontal' : 'pull_vertical'; break
        case 'lower_body':
          if (day.heavy_lower) { variant = 'knee_dominant'; emphasis = 'heavy' }
          else { variant = 'hinge'; emphasis = 'light' }
          break
        case 'plyo': variant = i % 2 === 0 ? 'maximal' : 'submaximal'; break
        default: variant = null
      }
      return { block_type: bt, variant, emphasis }
    })
    result.set(day.day_of_week, blocks)
  })
  return result
}

export type DroppedBlock = { block_type: WorkoutBlockType; reason: 'time' | 'coverage' }
export type FinalWorkout = {
  day_of_week: number
  blocks: PlannedWorkoutBlock[]
  dropped: DroppedBlock[]
  estimated_minutes: number
}

export function estimateMinutes(
  blocks: PlannedWorkoutBlock[], dose: 'normal' | 'maintenance', carriesSprintBlock: boolean,
  carriesConditioningFinisher = false, compact = false,
): number {
  const content = blocks.reduce((sum, b) => {
    const base = blockMinutes(b)
    // Kompakt und Maintenance stapeln sich nicht — beide stehen für dieselbe
    // Reduktion (weniger Sätze, kürzere Pausen).
    const scaled = (b.block_type === 'warmup' || b.block_type === 'cooldown') ? base
      : (dose === 'maintenance' || compact) ? base * MAINTENANCE_DOSE_FACTOR : base
    return sum + scaled
  }, 0)
  return Math.round(content
    + (carriesSprintBlock ? INTEGRATED_SPRINT_BLOCK_MINUTES : 0)
    + (carriesConditioningFinisher ? CONDITIONING_FINISHER_MINUTES : 0))
}

// Composition-Rework (§3.2): applyScalingLevers ist auf einen Minuten-Sanity-
// Clamp reduziert — composeWeek liefert bereits schlanke Sessions, hier wird nur
// gedroppt, falls die Blöcke das Zeitbudget doch sprengen. Geschützt: warmup,
// cooldown und der Primary (emphasis 'heavy'). Drop-Reihenfolge: verzichtbarste
// zuerst (conditioning → optional → accessory → core → plyo → Komplement-Kraft).
const SANITY_DROP_ORDER: WorkoutBlockType[] =
  ['conditioning', 'optional', 'accessory', 'core', 'plyo', 'upper_strength', 'lower_strength', 'pull', 'push', 'lower_body']

export function applyScalingLevers(
  placement: WeekPlacement, blockPlan: Map<number, PlannedWorkoutBlock[]>,
  _pillarLevels: PillarLevels = {},
): { workouts: FinalWorkout[]; notes: string[] } {
  const notes: string[] = []
  const workouts: FinalWorkout[] = []
  for (const day of placement.days.filter((d) => d.session_type === 'training')) {
    const blocks = [...(blockPlan.get(day.day_of_week) ?? [])]
    const dropped: DroppedBlock[] = []
    const isProtected = (b: PlannedWorkoutBlock) =>
      b.block_type === 'warmup' || b.block_type === 'cooldown' || b.emphasis === 'heavy'
    // Kraft-Floor (Spec 2026-10-10 §3.2, Review-Fix): am Säulen-Lead-Tag ist der
    // Kraft-Lead bewusst 'normal' — der letzte Kraftblock der Session darf dem
    // Minuten-Clamp trotzdem nie zum Opfer fallen.
    const STRENGTH_TYPES = new Set<WorkoutBlockType>(['lower_strength', 'upper_strength', 'push', 'pull', 'lower_body'])
    const isLastStrength = (b: PlannedWorkoutBlock) =>
      STRENGTH_TYPES.has(b.block_type) && blocks.filter((x) => STRENGTH_TYPES.has(x.block_type)).length === 1

    const compact = day.minutes <= COMPACT_SESSION_THRESHOLD_MINUTES
    const over = () => estimateMinutes(blocks, day.dose, day.carries_sprint_block, day.carries_conditioning_finisher, compact) > day.minutes
    while (over()) {
      const droppable = blocks.filter((b) => !isProtected(b) && !isLastStrength(b))
      if (droppable.length === 0) break
      droppable.sort((a, b) =>
        (SANITY_DROP_ORDER.indexOf(a.block_type) === -1 ? 99 : SANITY_DROP_ORDER.indexOf(a.block_type)) -
        (SANITY_DROP_ORDER.indexOf(b.block_type) === -1 ? 99 : SANITY_DROP_ORDER.indexOf(b.block_type)))
      const victim = droppable[0]
      blocks.splice(blocks.indexOf(victim), 1)
      dropped.push({ block_type: victim.block_type, reason: 'time' })
    }

    const estimated = estimateMinutes(blocks, day.dose, day.carries_sprint_block, day.carries_conditioning_finisher, compact)
    if (estimated > day.minutes) {
      notes.push(`Tag ${day.day_of_week}: Budget ${day.minutes} min nicht erreichbar (geschützter Kern ${estimated} min)`)
    }
    workouts.push({ day_of_week: day.day_of_week, blocks, dropped, estimated_minutes: estimated })
  }
  return { workouts, notes }
}

export type WeekLayout = {
  placement: WeekPlacement
  workouts: FinalWorkout[]
  carrier: SpeedCarrier
  notes: string[]
}

export function buildWeekLayout(input: WeekLayoutInput): WeekLayout {
  const allocation = allocateDays(input)
  const placement = placeWeek(input, allocation)
  // Composition-Rework (§1): Woche als Ganzes komponieren statt feste Pflichtsequenz.
  const blockPlan = composeWeek({
    trainingDays: placement.days.filter((d) => d.session_type === 'training'),
    pillarLevels: input.pillar_levels,
    hasSpeedSession: placement.days.some((d) => d.session_type === 'speed'),
  })
  const { workouts, notes } = applyScalingLevers(placement, blockPlan, input.pillar_levels)
  return { placement, workouts, carrier: placement.carrier, notes: [...placement.notes, ...notes] }
}
