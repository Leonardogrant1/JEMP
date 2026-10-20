import type { NewSessionType, WorkoutBlockType, PillarSlug } from './week-layout'

/** Mirrors the app's lib/load-profile caps (spec §2.1a). */
export const WORKOUT_DAY_CAP = { low: 5, medium: 3, high: 2 } as const
export const MIN_WORKOUT_DAYS = 2

// Session-Composition-Rework (Spec 2026-10-09 §1.1/§1.2).
/** Primary-Rotation über die Trainingstage — sichert die Kraft-Basis, säulenunabhängig. */
export const PRIMARY_ROTATION = ['lower_body', 'push', 'pull'] as const

/** Content-Blöcke (ohne Warmup/Cooldown) nach Session-Dauer: ≤30→3, ≤45→4, ≤60→5, sonst 6. */
export function contentBlockCount(minutes: number): number {
  if (minutes <= 30) return 3
  if (minutes <= 45) return 4
  if (minutes <= 60) return 5
  return 6
}

/** Fatigue cost per session type (spec §2.1b) — placement currency, not minutes. */
export const FATIGUE_COST: Record<NewSessionType, number> = {
  mobility: 0, conditioning: 2, training: 3, speed: 4,
}

// Core in Rotation verschmolzen (QA 09.10.): der rotation-Block deckt jetzt
// Rotationspower UND Rumpfstabilität ab — ein eigener core-Block entfällt.
export const WORKOUT_BLOCK_SEQUENCE: WorkoutBlockType[] =
  ['warmup', 'push', 'pull', 'lower_body', 'rotation', 'plyo', 'accessory', 'optional', 'cooldown']

export const BLOCK_MINUTES: Record<WorkoutBlockType, number> = {
  warmup: 8, push: 9, pull: 9, lower_body: 10, lower_strength: 10, upper_strength: 12,
  core: 5, conditioning: 10, plyo: 6, accessory: 6, optional: 5, cooldown: 4, rotation: 7,
}

/** Minuten eines Blocks — Kraftblöcke skalieren mit der Pattern-Zahl
 *  (Review 10.10.: der Pull-only-Begleitblock darf nicht wie 2 Übungen zählen). */
export function blockMinutes(b: { block_type: WorkoutBlockType; patterns?: Array<{ pattern: string }> }): number {
  if ((b.block_type === 'upper_strength' || b.block_type === 'lower_strength') && b.patterns?.length === 1) {
    return b.block_type === 'upper_strength' ? 6 : BLOCK_MINUTES.lower_strength
  }
  return BLOCK_MINUTES[b.block_type]
}
export const MAINTENANCE_DOSE_FACTOR = 0.7

/** Minuten-Schätzung einer Session aus ihren Blöcken. Lebt bei den Konstanten,
 *  damit auch composition.ts sie nutzen kann (week-layout importiert composition —
 *  ein Import zurück wäre ein Zyklus). */
export function estimateMinutes(
  blocks: Array<{ block_type: WorkoutBlockType; patterns?: Array<{ pattern: string }> }>,
  dose: 'normal' | 'maintenance', carriesSprintBlock: boolean,
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
/** Kompakt-Modus (QA 09.10.): kurze Sessions rechnen Content-Blöcke mit 0.7
 *  (2 Sätze, Supersätze, kürzere Pausen) — sonst bleibt bei 30 min nach dem
 *  geschützten Kern (Warmup/Lower/Cooldown) kein Platz für irgendetwas. */
export const COMPACT_SESSION_THRESHOLD_MINUTES = 45
export const COMPACT_DOSE_FACTOR = 0.7
export const INTEGRATED_SPRINT_BLOCK_MINUTES = 12
export const CONDITIONING_FINISHER_MINUTES = 10
/** Drop order when no coverage/rotation signal decides (lowest value drops first). */
export const DROP_PRIORITY: WorkoutBlockType[] = ['optional', 'accessory', 'rotation', 'plyo', 'pull', 'push']

/** Block → pillar mapping for the §2.9(b) drop priority. Unmapped blocks count as level 1. */
export const BLOCK_TO_PILLAR: Partial<Record<WorkoutBlockType, PillarSlug>> = {
  push: 'strength', pull: 'strength', lower_body: 'strength',
  plyo: 'lower_body_plyometrics', rotation: 'upper_body_plyometrics',
}
