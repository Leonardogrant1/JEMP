import type { NewSessionType } from './week-layout'

/** Mirrors the app's lib/load-profile caps (spec §2.1a). */
export const WORKOUT_DAY_CAP = { low: 4, medium: 3, high: 2 } as const
export const MIN_WORKOUT_DAYS = 2

/** Fatigue cost per session type (spec §2.1b) — placement currency, not minutes. */
export const FATIGUE_COST: Record<NewSessionType, number> = {
  mobility: 0, conditioning: 2, training: 3, speed: 4,
}
