// Swap-Pool (Spec 2026-10-19 §2): exakt die Generator-Semantik — Worker-Code
// wird importiert und gebundelt, nie kopiert. Deploy-Kopplung beachten:
// Änderungen an v2/pool.ts oder v2/exercise-filter.ts brauchen API-Redeploy.
import { makeExerciseFilter, type ExerciseFilterMaps } from '../../../jemp-temporal-worker/src/plan-generation/v2/exercise-filter'
import { exerciseMatchesBlock, matchesStrengthPattern, type V2Exercise } from '../../../jemp-temporal-worker/src/plan-generation/v2/pool'
import { effectiveRegion } from '../../../jemp-temporal-worker/src/plan-generation/taxonomy'

export type SwapPoolInput = {
  exercises: V2Exercise[]
  maps: ExerciseFilterMaps
  sportGate: (row: { id: string; is_sport_specific?: boolean | null }) => boolean
  dayEnvId: string | null
  blockTypeSlug: string
  currentExercise: V2Exercise
  assignedPattern: string | null
  patternEmphasis: 'heavy' | 'normal' | null
  /** Session-Dedupe (QA 19.10.): Übungen, die in der Session schon verplant
   *  sind — nie als Alternative anbieten (die aktuelle Übung ist ohnehin
   *  drin und bleibt über den id-Check draußen). Optional für Tests. */
  excludeExerciseIds?: Set<string>
}
export type SwapPoolResult = {
  alternatives: V2Exercise[]
  locked: Array<{ exercise: V2Exercise; unlock_level: number }>
}

const LOCKED_LIMIT = 5

/** Kraftblöcke: lower_strength/upper_strength sind die aktuelle Benennung,
 *  push/pull/lower_body die Legacy-Slugs aus Alt-Plänen (Finding 2a) — beide
 *  Varianten brauchen Pattern-Bindung + Heavy-Fallback, sonst bleibt der
 *  Swap-Pool für Alt-Pläne leer. */
const STRENGTH_BLOCK_SLUGS = new Set(['lower_strength', 'upper_strength', 'push', 'pull', 'lower_body'])

/** Region-Bindung (QA 19.10.): In den Nicht-Kraftblöcken ist der Block-Pool
 *  regionsübergreifend (Accessory = groin/hip/calf/ankle gemischt) — für den
 *  Generator gleichwertig besetzbar, beim manuellen Tausch aber falsch: Wer
 *  eine Wadenübung tauscht, erwartet Waden-Alternativen. Kandidaten müssen
 *  dieselbe effectiveRegion treffen wie die aktuelle Übung (dasselbe
 *  Gruppierungskriterium wie rotatedPoolWindow). Kraft bindet übers Pattern,
 *  Plyo über die Variante, Core bleibt frei (alles Rumpf, Ebenen-Sortierung
 *  priorisiert like-for-like). */
const REGION_BOUND_BLOCKS = new Set(['accessory', 'optional', 'warmup', 'cooldown'])

/** Blockdefinition like-for-like aus der aktuellen Übung rekonstruieren —
 *  plyo-Variante ist nicht materialisiert (Spec §2): upper bleibt upper. */
function blockDefFor(blockTypeSlug: string, current: V2Exercise): any {
  if (blockTypeSlug === 'plyo') {
    return { block_type: 'plyo', variant: current.category_slug === 'upper_body_plyometrics' ? 'upper' : 'lower' }
  }
  if (STRENGTH_BLOCK_SLUGS.has(blockTypeSlug)) {
    // Legacy 'push'/'pull' auf upper_strength, 'lower_body' auf lower_strength
    // ummünzen (Finding 2a) — exerciseMatchesBlock kennt diese Legacy-Slugs
    // nur über blockDef.variant als Pattern, nicht als Pattern-Liste. Die
    // eigentliche Einschränkung (push vs. pull, upper vs. lower) übernimmt
    // ohnehin resolvePatterns über die Patterns der aktuellen Übung.
    const mappedBlockType = blockTypeSlug === 'lower_body' ? 'lower_strength'
      : blockTypeSlug === 'push' || blockTypeSlug === 'pull' ? 'upper_strength'
      : blockTypeSlug
    // Pattern-Bindung läuft separat über matchesStrengthPattern — hier alle
    // Patterns erlauben, damit exerciseMatchesBlock nicht doppelt gated.
    return { block_type: mappedBlockType, variant: null, patterns: ALL_PATTERNS.map((p) => ({ pattern: p })) }
  }
  return { block_type: blockTypeSlug, variant: null }
}
const ALL_PATTERNS = ['push_vertical', 'push_horizontal', 'pull_vertical', 'pull_horizontal', 'knee_dominant', 'hinge', 'rotation']

/** Pattern-Menge der Zeile: Spalte exakt, sonst alle Patterns, die die
 *  aktuelle Übung selbst erfüllt (Coarse-Fallback inklusive) — der bare
 *  BODY_REGION_TO_PATTERN-String ('push') matcht getaggte Kandidaten nie. */
function resolvePatterns(current: V2Exercise, assignedPattern: string | null): string[] {
  if (assignedPattern) return [assignedPattern]
  return ALL_PATTERNS.filter((p) => matchesStrengthPattern(current, p))
}

/** Heavy like-for-like-Fallback für Alt-Pläne ohne pattern_emphasis-Spalte. */
function isHeavy(current: V2Exercise, patternEmphasis: string | null, blockTypeSlug: string): boolean {
  if (patternEmphasis) return patternEmphasis === 'heavy'
  const isStrengthBlock = STRENGTH_BLOCK_SLUGS.has(blockTypeSlug)
  return isStrengthBlock && current.movement_type === 'sagittal' && (current.intensity_score ?? 5) >= 5
}

export function buildSwapPool(input: SwapPoolInput): SwapPoolResult {
  const { exercises, maps, sportGate, dayEnvId, blockTypeSlug, currentExercise } = input
  const blockDef = blockDefFor(blockTypeSlug, currentExercise)
  const patterns = STRENGTH_BLOCK_SLUGS.has(blockTypeSlug)
    ? resolvePatterns(currentExercise, input.assignedPattern)
    : []
  const heavy = patterns.length > 0 && isHeavy(currentExercise, input.patternEmphasis, blockTypeSlug)
  const currentRegion = REGION_BOUND_BLOCKS.has(blockTypeSlug) ? effectiveRegion(currentExercise) : undefined

  const fullFilter = makeExerciseFilter(maps, dayEnvId)
  // Locked = alles außer Level: Filter-Klon ohne Level-Daten überspringt den Check.
  const noLevelFilter = makeExerciseFilter({ ...maps, hasLevelData: false }, dayEnvId)

  const inGroup = (e: V2Exercise): boolean => {
    if (e.id === currentExercise.id) return false
    if (input.excludeExerciseIds?.has(e.id)) return false
    if (!sportGate(e as any)) return false
    if (!exerciseMatchesBlock(e, blockDef)) return false
    // full_body ist Joker in beide Richtungen (QA 19.10.: strikte Gleichheit
    // ließ groin-Warmups leer zurück) — Ganzkörper-Drills passen zu jeder
    // Region, nur Fremd-Region zu Fremd-Region bleibt verboten. Joker über
    // das ROHE body_region: effectiveRegion löst full_body zur Dominant-
    // Region auf (worlds_greatest_stretch → hip) und würde den Joker nie
    // zünden.
    if (currentRegion !== undefined) {
      const matches = effectiveRegion(e) === currentRegion
        || e.body_region === 'full_body' || currentExercise.body_region === 'full_body'
      if (!matches) return false
    }
    if (patterns.length > 0 && !patterns.some((p) => matchesStrengthPattern(e, p))) return false
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
