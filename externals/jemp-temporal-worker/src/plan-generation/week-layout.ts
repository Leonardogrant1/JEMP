// Deterministic week-layout engine (spec §2.1, §2.9). Pure: no IO, no Date.
// Wired into the pipeline in Phase 2b behind the set_by_wizard gate.

/** Forward distance in days from `from` to `to` on the circular week (1=Mon..7=Sun). */
export function circularDayDistance(from: number, to: number): number {
  return ((to - from) % 7 + 7) % 7
}

import type { WeeklySchedule } from './types'
import { WORKOUT_DAY_CAP, MIN_WORKOUT_DAYS, WORKOUT_BLOCK_SEQUENCE, BLOCK_MINUTES, MAINTENANCE_DOSE_FACTOR, INTEGRATED_SPRINT_BLOCK_MINUTES, DROP_PRIORITY, BLOCK_TO_PILLAR } from './week-layout-constants'

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

  if (speedLevel === 3) {
    if (workouts - 1 >= MIN_WORKOUT_DAYS) {
      workouts -= 1
      spare += 1
    }
    if (spare > 0) { speedDays = 1; spare -= 1; carrier = 'standalone' }
    else carrier = 'integrated' // 2-day edge case (spec §2.1a)
    if (carrier === 'standalone' && spare > 0) { speedDays += 1; spare -= 1 } // second day: surplus only
  } else if (speedLevel === 2) {
    if (spare > 0) { speedDays = 1; spare -= 1; carrier = 'standalone' }
    else carrier = 'integrated'
  }

  // Conditioning own day: level >= 2, low weekly load (damping §2.2), day to spare.
  const conditioningLevel = input.pillar_levels.conditioning ?? 0
  let conditioningDay = false
  if (conditioningLevel >= 2 && input.load_profile === 'low' && spare > 0) {
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
  heavy_lower: boolean
  suppress_micro_dose: boolean
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

  // A day qualifies for the block-sized integrated sprint volume only ≥72h
  // before a game — otherwise the carrier degrades to micro (spec §2.1b.5).
  const integratedLegal = (day: number) => gameFwd(day) >= 3

  let carrier = allocation.carrier
  let speedDayCount = allocation.speed_days
  // Sanitize: game/tournament days are never schedulable, even if the user
  // left them toggled "available" (review C2 — heavy squats on match day).
  const pool = [...input.available_days].filter((d) => !gameDays.includes(d)).sort((a, b) => a - b)
  for (const d of input.available_days) if (gameDays.includes(d)) {
    notes.push(`Tag ${d} ist Spiel-/Turniertag — aus den Trainingstagen entfernt`)
  }

  // 1. Speed days: legal days; avoid post-game days, then shortest minutes first.
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
      carrier = pool.some(integratedLegal) ? 'integrated' : 'micro'
      notes.push('Speed: kein legales Fenster (72h-Regel) — Standalone zu ' + carrier + ' degradiert')
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
  let sprintBlockDay: number | null = null
  if (carrier === 'integrated') {
    const legalCarriers = trainingDays.filter(integratedLegal).sort((a, b) =>
      afterPenalty(a) - afterPenalty(b) || gameFwdFinite(b) - gameFwdFinite(a) ||
      minutesFor(input, b) - minutesFor(input, a) || a - b)
    if (legalCarriers.length > 0) sprintBlockDay = legalCarriers[0]
    else {
      carrier = 'micro'
      notes.push('Speed: kein Workout-Tag ≥72h vor dem Spiel — integrierter Block zu micro degradiert')
    }
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

  const days: PlacedDay[] = []
  for (const d of speedDays) days.push({
    day_of_week: d, session_type: 'speed', minutes: Math.min(minutesFor(input, d), 40),
    dose: gameWeek ? 'maintenance' : 'normal',
    carries_sprint_block: false, heavy_lower: false, suppress_micro_dose: false,
  })
  if (conditioningDay !== null) days.push({
    day_of_week: conditioningDay, session_type: 'conditioning', minutes: minutesFor(input, conditioningDay),
    dose: 'normal', carries_sprint_block: false, heavy_lower: false, suppress_micro_dose: false,
  })
  for (const d of trainingDays) days.push({
    day_of_week: d, session_type: 'training', minutes: minutesFor(input, d), dose: 'normal',
    carries_sprint_block: d === sprintBlockDay,
    heavy_lower: d === heavyDay || (d === sprintBlockDay && heavyDay === null),
    suppress_micro_dose: speedDays.some((s) => circularDayDistance(s, d) === 1),
  })
  if (sprintBlockDay !== null && heavyDay !== null && sprintBlockDay !== heavyDay) {
    // One consolidated high day (spec §2.5): the sprint-block day IS the heavy day.
    for (const day of days) if (day.session_type === 'training') day.heavy_lower = day.day_of_week === sprintBlockDay
  }
  if (mobilityDay !== null) days.push({
    day_of_week: mobilityDay, session_type: 'mobility', minutes: 20, dose: 'normal',
    carries_sprint_block: false, heavy_lower: false, suppress_micro_dose: false,
  })

  days.sort((a, b) => a.day_of_week - b.day_of_week)
  return { days, carrier, notes }
}

export type WorkoutBlockType =
  | 'warmup' | 'push' | 'pull' | 'lower_body' | 'rotation' | 'core' | 'plyo' | 'accessory' | 'cooldown'
export type PlannedWorkoutBlock = {
  block_type: WorkoutBlockType
  variant: string | null
  emphasis: 'heavy' | 'normal' | 'light'
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
        case 'core': variant = i % 2 === 0 ? 'stability' : 'power'; break
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
): number {
  const content = blocks.reduce((sum, b) => {
    const base = BLOCK_MINUTES[b.block_type]
    const scaled = (b.block_type === 'warmup' || b.block_type === 'cooldown') ? base
      : dose === 'maintenance' ? base * MAINTENANCE_DOSE_FACTOR : base
    return sum + scaled
  }, 0)
  return Math.round(content + (carriesSprintBlock ? INTEGRATED_SPRINT_BLOCK_MINUTES : 0))
}

export function applyScalingLevers(
  placement: WeekPlacement, blockPlan: Map<number, PlannedWorkoutBlock[]>,
  pillarLevels: PillarLevels = {},
): { workouts: FinalWorkout[]; notes: string[] } {
  // Drop priority (b) per spec §2.9: lowest pillar levels drop first — user
  // emphases survive. Blocks without a pillar mapping count as level 1.
  const levelOf = (bt: WorkoutBlockType): number => {
    const pillar = BLOCK_TO_PILLAR[bt]
    return pillar ? (pillarLevels[pillar] ?? 1) : 1
  }
  const notes: string[] = []
  const coveredVariants = new Set<string>() // in-plan coverage ledger
  let previousDrops = new Set<WorkoutBlockType>() // in-plan drop rotation

  const workouts: FinalWorkout[] = []
  for (const day of placement.days.filter((d) => d.session_type === 'training')) {
    const blocks = [...(blockPlan.get(day.day_of_week) ?? [])]
    const dropped: DroppedBlock[] = []
    const protectedTypes = new Set<WorkoutBlockType>(['warmup', 'cooldown', 'lower_body'])

    const droppable = () => blocks.filter((b) => !protectedTypes.has(b.block_type))

    while (estimateMinutes(blocks, day.dose, day.carries_sprint_block) > day.minutes && droppable().length > 0) {
      const candidates = droppable()
      // (a) coverage: variants already seen this week drop first
      const covered = candidates.filter((b) => b.variant !== null && coveredVariants.has(b.variant))
      // (c) drop rotation: avoid re-dropping last workout's drops when alternatives exist
      const pickFrom = (list: PlannedWorkoutBlock[]) => {
        const fresh = list.filter((b) => !previousDrops.has(b.block_type))
        return (fresh.length > 0 ? fresh : list)
      }
      const pool = covered.length > 0 ? pickFrom(covered) : pickFrom(candidates)
      // (b) lowest pillar level first (user emphases survive), fixed priority as final tiebreak
      pool.sort((a, b) =>
        levelOf(a.block_type) - levelOf(b.block_type) ||
        DROP_PRIORITY.indexOf(a.block_type) - DROP_PRIORITY.indexOf(b.block_type))
      const victim = pool[0]
      blocks.splice(blocks.indexOf(victim), 1)
      dropped.push({ block_type: victim.block_type, reason: 'time' })
    }

    const estimated = estimateMinutes(blocks, day.dose, day.carries_sprint_block)
    if (estimated > day.minutes) {
      notes.push(`Tag ${day.day_of_week}: Budget ${day.minutes} min nicht erreichbar (geschützter Kern ${estimated} min)`)
    }
    for (const b of blocks) if (b.variant) coveredVariants.add(b.variant)
    previousDrops = new Set(dropped.map((d) => d.block_type))
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
  const blockPlan = planWorkoutBlocks(placement)
  const { workouts, notes } = applyScalingLevers(placement, blockPlan)
  return { placement, workouts, carrier: placement.carrier, notes: [...placement.notes, ...notes] }
}
