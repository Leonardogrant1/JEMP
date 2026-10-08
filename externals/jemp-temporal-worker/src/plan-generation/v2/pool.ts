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
}

const ACCESSORY_REGIONS = new Set(['groin', 'hip', 'calf', 'ankle', 'bicep', 'tricep', 'forearm'])
const PLYO_CATEGORIES = new Set(['jumps', 'lower_body_plyometrics'])

/** Coarse pattern for untagged exercises (legacy derivation). */
function coarsePattern(ex: V2Exercise): string | null {
  const region = effectiveRegion(ex)
  return region ? (BODY_REGION_TO_PATTERN[region] ?? null) : null
}

export function exerciseMatchesBlock(ex: V2Exercise, blockDef: PlannedWorkoutBlock): boolean {
  switch (blockDef.block_type) {
    case 'push':
      if (ex.strength_pattern !== null) return ex.strength_pattern === blockDef.variant
      return ex.category_slug === 'strength' && coarsePattern(ex) === 'push'
    case 'pull':
      if (ex.strength_pattern !== null) return ex.strength_pattern === blockDef.variant
      return ex.category_slug === 'strength' && coarsePattern(ex) === 'pull'
    case 'lower_body': {
      if (ex.strength_pattern !== null) return ex.strength_pattern === blockDef.variant
      const coarse = blockDef.variant === 'knee_dominant' ? 'squat' : 'hinge'
      return ex.category_slug === 'strength' && coarsePattern(ex) === coarse
    }
    case 'rotation':
      return ex.strength_pattern === 'rotation' // rotation needs the tag — no fallback
    case 'core':
      return ex.core_type === blockDef.variant // core needs the tag — no fallback
    case 'plyo':
      if (ex.sprint_type !== null) return false // sprints never fill plyo blocks
      if (ex.plyo_type !== null) return ex.plyo_type === blockDef.variant && PLYO_CATEGORIES.has(ex.category_slug)
      return PLYO_CATEGORIES.has(ex.category_slug)
    case 'accessory': {
      const region = effectiveRegion(ex)
      return ex.category_slug === 'strength' && region !== null && ACCESSORY_REGIONS.has(region)
    }
    case 'warmup':
      if (ex.category_slug === 'mobility') return true
      return PLYO_CATEGORIES.has(ex.category_slug) && ex.sprint_type === null && (ex.intensity_score ?? 10) <= 3
    case 'cooldown':
      return ex.category_slug === 'mobility'
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
