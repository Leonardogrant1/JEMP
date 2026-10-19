// Swap-Pool (Spec 2026-10-19 §2): exakt die Generator-Semantik — Worker-Code
// wird importiert und gebundelt, nie kopiert. Deploy-Kopplung beachten:
// Änderungen an v2/pool.ts oder v2/exercise-filter.ts brauchen API-Redeploy.
import { makeExerciseFilter, type ExerciseFilterMaps } from '../../../jemp-temporal-worker/src/plan-generation/v2/exercise-filter'
import { exerciseMatchesBlock, matchesStrengthPattern, type V2Exercise } from '../../../jemp-temporal-worker/src/plan-generation/v2/pool'
import { BODY_REGION_TO_PATTERN, effectiveRegion } from '../../../jemp-temporal-worker/src/plan-generation/taxonomy'

export type SwapPoolInput = {
  exercises: V2Exercise[]
  maps: ExerciseFilterMaps
  sportGate: (row: { id: string; is_sport_specific?: boolean | null }) => boolean
  dayEnvId: string | null
  blockTypeSlug: string
  currentExercise: V2Exercise
  assignedPattern: string | null
  patternEmphasis: 'heavy' | 'normal' | null
}
export type SwapPoolResult = {
  alternatives: V2Exercise[]
  locked: Array<{ exercise: V2Exercise; unlock_level: number }>
}

const LOCKED_LIMIT = 5

/** Blockdefinition like-for-like aus der aktuellen Übung rekonstruieren —
 *  plyo-Variante ist nicht materialisiert (Spec §2): upper bleibt upper. */
function blockDefFor(blockTypeSlug: string, current: V2Exercise): any {
  if (blockTypeSlug === 'plyo') {
    return { block_type: 'plyo', variant: current.category_slug === 'upper_body_plyometrics' ? 'upper' : 'lower' }
  }
  if (blockTypeSlug === 'lower_strength' || blockTypeSlug === 'upper_strength') {
    // Pattern-Bindung läuft separat über matchesStrengthPattern — hier alle
    // Patterns erlauben, damit exerciseMatchesBlock nicht doppelt gated.
    return { block_type: blockTypeSlug, variant: null, patterns: ALL_PATTERNS.map((p) => ({ pattern: p })) }
  }
  return { block_type: blockTypeSlug, variant: null }
}
const ALL_PATTERNS = ['push_vertical', 'push_horizontal', 'pull_vertical', 'pull_horizontal', 'knee_dominant', 'hinge', 'rotation']

/** Pattern der Zeile: Spalte, sonst Ableitung aus der Übung (eindeutig). */
function resolvePattern(current: V2Exercise, assignedPattern: string | null): string | null {
  if (assignedPattern) return assignedPattern
  if (current.strength_pattern) return current.strength_pattern
  if (current.category_slug !== 'strength') return null
  const region = effectiveRegion(current)
  const coarse = region ? BODY_REGION_TO_PATTERN[region] ?? null : null
  return coarse === 'squat' ? 'knee_dominant' : coarse
}

/** Heavy like-for-like-Fallback für Alt-Pläne ohne pattern_emphasis-Spalte. */
function isHeavy(current: V2Exercise, patternEmphasis: string | null, blockTypeSlug: string): boolean {
  if (patternEmphasis) return patternEmphasis === 'heavy'
  const isStrengthBlock = blockTypeSlug === 'lower_strength' || blockTypeSlug === 'upper_strength'
  return isStrengthBlock && current.movement_type === 'sagittal' && (current.intensity_score ?? 5) >= 5
}

export function buildSwapPool(input: SwapPoolInput): SwapPoolResult {
  const { exercises, maps, sportGate, dayEnvId, blockTypeSlug, currentExercise } = input
  const blockDef = blockDefFor(blockTypeSlug, currentExercise)
  const pattern = (blockTypeSlug === 'lower_strength' || blockTypeSlug === 'upper_strength')
    ? resolvePattern(currentExercise, input.assignedPattern)
    : null
  const heavy = pattern !== null && isHeavy(currentExercise, input.patternEmphasis, blockTypeSlug)

  const fullFilter = makeExerciseFilter(maps, dayEnvId)
  // Locked = alles außer Level: Filter-Klon ohne Level-Daten überspringt den Check.
  const noLevelFilter = makeExerciseFilter({ ...maps, hasLevelData: false }, dayEnvId)

  const inGroup = (e: V2Exercise): boolean => {
    if (e.id === currentExercise.id) return false
    if (!sportGate(e as any)) return false
    if (!exerciseMatchesBlock(e, blockDef)) return false
    if (pattern && !matchesStrengthPattern(e, pattern)) return false
    if (heavy && (e.movement_type !== 'sagittal' || (e.intensity_score ?? 5) < 5)) return false
    return true
  }

  const alternatives = exercises
    .filter((e) => inGroup(e) && fullFilter(e as any))
    .sort((a, b) =>
      Number(b.movement_type === currentExercise.movement_type) - Number(a.movement_type === currentExercise.movement_type)
      || a.slug.localeCompare(b.slug))

  const altIds = new Set(alternatives.map((a) => a.id))
  const locked = !maps.hasLevelData ? [] : exercises
    .filter((e) => inGroup(e) && !altIds.has(e.id) && noLevelFilter(e as any))
    .map((e) => ({ exercise: e, unlock_level: e.min_level }))
    // nur ZU SCHWERE (User unter min_level) — zu leichte bleiben unsichtbar
    .filter(({ exercise }) => {
      const catId = ((exercise as any).categories as { id?: string } | null)?.id
      const level = catId ? maps.levelByCategoryId.get(catId) : undefined
      return level !== undefined && level < exercise.min_level
    })
    .sort((a, b) => a.unlock_level - b.unlock_level)
    .slice(0, LOCKED_LIMIT)

  return { alternatives, locked }
}
