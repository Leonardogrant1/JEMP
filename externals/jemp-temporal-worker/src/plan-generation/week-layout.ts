// Deterministic week-layout engine (spec §2.1, §2.9). Pure: no IO, no Date.
// Wired into the pipeline in Phase 2b behind the set_by_wizard gate.

/** Forward distance in days from `from` to `to` on the circular week (1=Mon..7=Sun). */
export function circularDayDistance(from: number, to: number): number {
  return ((to - from) % 7 + 7) % 7
}

import type { WeeklySchedule } from './types'
import { WORKOUT_DAY_CAP, MIN_WORKOUT_DAYS } from './week-layout-constants'

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
