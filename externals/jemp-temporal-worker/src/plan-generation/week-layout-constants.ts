import type { NewSessionType, WorkoutBlockType, PillarSlug } from './week-layout'

/** Mirrors the app's lib/load-profile caps (spec §2.1a). */
export const WORKOUT_DAY_CAP = { low: 4, medium: 3, high: 2 } as const
export const MIN_WORKOUT_DAYS = 2

/** Fatigue cost per session type (spec §2.1b) — placement currency, not minutes. */
export const FATIGUE_COST: Record<NewSessionType, number> = {
  mobility: 0, conditioning: 2, training: 3, speed: 4,
}

export const WORKOUT_BLOCK_SEQUENCE: WorkoutBlockType[] =
  ['warmup', 'push', 'pull', 'lower_body', 'rotation', 'core', 'plyo', 'accessory', 'cooldown']

export const BLOCK_MINUTES: Record<WorkoutBlockType, number> = {
  warmup: 8, push: 9, pull: 9, lower_body: 10, rotation: 5, core: 5, plyo: 6, accessory: 6, cooldown: 4,
}
export const MAINTENANCE_DOSE_FACTOR = 0.7
export const INTEGRATED_SPRINT_BLOCK_MINUTES = 12
/** Drop order when no coverage/rotation signal decides (lowest value drops first). */
export const DROP_PRIORITY: WorkoutBlockType[] = ['accessory', 'rotation', 'core', 'plyo', 'pull', 'push']

/** Block → pillar mapping for the §2.9(b) drop priority. Unmapped blocks count as level 1. */
export const BLOCK_TO_PILLAR: Partial<Record<WorkoutBlockType, PillarSlug>> = {
  push: 'strength', pull: 'strength', lower_body: 'strength',
  plyo: 'lower_body_plyometrics', rotation: 'upper_body_plyometrics',
}
