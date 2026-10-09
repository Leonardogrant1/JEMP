// v2 pattern-block pool matching (spec §2.4, §6.2c). Pure.
// Metadata first; untagged exercises fall back to the coarse
// BODY_REGION_TO_PATTERN derivation so the partial backfill never
// empties a pool (phase 2b review focus 2).

import { BODY_REGION_TO_PATTERN, effectiveRegion } from '../generate-plan'
import type { PlannedWorkoutBlock, WorkoutBlockType } from '../week-layout'

export type V2Exercise = {
  id: string
  slug: string
  name: string
  category_slug: string
  body_region: string | null
  dominant_region: string | null
  strength_pattern: string | null
  plyo_type: string | null
  core_type: string | null
  sprint_type: string | null
  covered_patterns: string[] | null
  laterality: string | null
  min_level: number
  max_level: number
  intensity_score: number | null
  measurement_type: string | null
  /** Legacy block_type-Zuordnung (warmup/cooldown/…) — steuert, ob eine
   *  Mobility-Übung ins Warmup oder Cooldown darf. null = kein Tag, Fallback. */
  legacy_block_slugs: string[] | null
  /** Bewegungsebene (§2.1): sagittal|frontal|transverse. */
  movement_type: string
  /** Dynamik (§2.2): ballistisch ausgeführt. */
  is_explosive: boolean
}

const ACCESSORY_REGIONS = new Set(['groin', 'hip', 'calf', 'ankle'])
// Optional-Block (Kür): isolierte Small-Muscle-Arbeit — bewusst getrennt vom
// funktionellen Accessory, damit Show-Muskeln nie Prophylaxe verdrängen.
// 'shoulder' (QA 09.10.): pattern-lose Schulter-Übungen sind Isolationen
// (Seitheben) — echte Presses tragen seit dem Backfill push_vertical.
const OPTIONAL_REGIONS = new Set(['bicep', 'tricep', 'forearm', 'shoulder'])
const PLYO_CATEGORIES = new Set(['jumps', 'lower_body_plyometrics'])

/** Legacy-Block-Tag steuert Warmup/Cooldown-Eignung; ohne Tag (null/leer)
 *  bleibt das bisherige Verhalten (beide erlaubt). Exportiert, damit die
 *  Prebuilt-Builder (Speed/Conditioning) denselben Filter nutzen. */
export function legacyBlockAllows(ex: V2Exercise, slug: string): boolean {
  if (!ex.legacy_block_slugs || ex.legacy_block_slugs.length === 0) return true
  return ex.legacy_block_slugs.includes(slug)
}

/** Coarse pattern for untagged exercises (legacy derivation). */
function coarsePattern(ex: V2Exercise): string | null {
  const region = effectiveRegion(ex)
  return region ? (BODY_REGION_TO_PATTERN[region] ?? null) : null
}

export function exerciseMatchesBlock(ex: V2Exercise, blockDef: PlannedWorkoutBlock): boolean {
  switch (blockDef.block_type) {
    case 'push':
      if (ex.strength_pattern !== null) return ex.strength_pattern === blockDef.variant
      // Isolations-Leck (QA 09.10.): Optional-Regionen (bicep/tricep/shoulder…)
      // mappen coarse auf push/pull — sie gehören aber in den Optional-Block.
      return ex.category_slug === 'strength' && coarsePattern(ex) === 'push'
        && !OPTIONAL_REGIONS.has(effectiveRegion(ex) ?? '')
    case 'pull':
      if (ex.strength_pattern !== null) return ex.strength_pattern === blockDef.variant
      return ex.category_slug === 'strength' && coarsePattern(ex) === 'pull'
        && !OPTIONAL_REGIONS.has(effectiveRegion(ex) ?? '')
    case 'lower_body': {
      if (ex.strength_pattern !== null) return ex.strength_pattern === blockDef.variant
      const coarse = blockDef.variant === 'knee_dominant' ? 'squat' : 'hinge'
      return ex.category_slug === 'strength' && coarsePattern(ex) === coarse
    }
    case 'core': {
      // Composition-Rework (§1.5/§2.3): core_type ist das Zugehörigkeits-Gate
      // ("ist Core-Übung"); Verfeinerung über movement_type + is_explosive.
      if (ex.core_type === null) return false
      if (!blockDef.variant) return true // kein Mix gefordert → jede Core-Übung
      if (blockDef.variant === 'explosive') return ex.is_explosive === true
      return ex.movement_type === blockDef.variant // 'sagittal'|'frontal'|'transverse'
    }
    case 'plyo':
      // Variante = Säule (§1.6): lower = lower_body_plyometrics/jumps, upper = upper_body_plyometrics.
      if (ex.sprint_type !== null) return false // sprints never fill plyo blocks
      if (blockDef.variant === 'upper') return ex.category_slug === 'upper_body_plyometrics'
      if (blockDef.variant === 'lower') return PLYO_CATEGORIES.has(ex.category_slug)
      return PLYO_CATEGORIES.has(ex.category_slug) || ex.category_slug === 'upper_body_plyometrics'
    case 'accessory': {
      const region = effectiveRegion(ex)
      return ex.category_slug === 'strength' && ex.strength_pattern === null && ex.core_type === null
        && region !== null && ACCESSORY_REGIONS.has(region)
    }
    case 'optional': {
      const region = effectiveRegion(ex)
      return ex.category_slug === 'strength' && ex.strength_pattern === null && ex.core_type === null
        && region !== null && OPTIONAL_REGIONS.has(region)
    }
    case 'warmup':
      // Mobility nur ins Warmup, wenn der Legacy-Tag es erlaubt (QA 09.10.):
      // statische Stretches/Atemübungen sind cooldown-only getaggt.
      if (ex.category_slug === 'mobility') return legacyBlockAllows(ex, 'warmup')
      // CNS-Mikro-Dosis (QA 08.10.): Sprint-Technik-Drills (Ministeps, Skips)
      // leben seit der Rekategorisierung in 'sprints' — ohne diesen Zweig
      // hätte der Warmup-Prompt einen leeren Drill-Pool.
      if (ex.category_slug === 'sprints' && ex.sprint_type === null && (ex.intensity_score ?? 10) <= 3) return true
      return PLYO_CATEGORIES.has(ex.category_slug) && ex.sprint_type === null && (ex.intensity_score ?? 10) <= 3
    case 'cooldown':
      return ex.category_slug === 'mobility' && legacyBlockAllows(ex, 'cooldown')
    default:
      return false
  }
}

export function buildBlockPools(
  exercises: V2Exercise[],
  blocks: PlannedWorkoutBlock[],
): Map<WorkoutBlockType, V2Exercise[]> {
  const pools = new Map<WorkoutBlockType, V2Exercise[]>()
  for (const b of blocks) {
    pools.set(b.block_type, exercises.filter((ex) => exerciseMatchesBlock(ex, b)))
  }
  return pools
}

/** Review fix I2: blocks whose pool is empty are pre-dropped deterministically
 *  (reason 'coverage' feeds the §2.9 dropped_blocks audit) instead of sending
 *  the LLM an unsatisfiable structure. Warmup/cooldown are never dropped. */
export function preDropEmptyPools(
  workout: { blocks: PlannedWorkoutBlock[]; dropped: Array<{ block_type: WorkoutBlockType; reason: 'time' | 'coverage' }> },
  pools: Record<string, string[]>,
): string[] {
  const notes: string[] = []
  const keep: PlannedWorkoutBlock[] = []
  for (const b of workout.blocks) {
    const isProtected = b.block_type === 'warmup' || b.block_type === 'cooldown'
    if (!isProtected && (pools[b.block_type] ?? []).length === 0) {
      workout.dropped.push({ block_type: b.block_type, reason: 'coverage' })
      notes.push(`Block "${b.block_type}" ohne passende Übungen im Pool — vorab gedroppt`)
    } else {
      keep.push(b)
    }
  }
  workout.blocks = keep
  return notes
}
