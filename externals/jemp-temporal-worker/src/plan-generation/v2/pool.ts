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
  /** exercise_regions (10.10.): alle betroffenen Regionen inkl. Rolle.
   *  null/leer = noch nicht kuratiert → Fallback auf body_region/dominant_region. */
  regions: Array<{ region: string; role: string }> | null
}

/** Rahmen-Übungen der Sprint-Session (Traben, Steigerungsläufe) — leben als
 *  Slug-Anker im Speed-Builder und haben in Workout-Warmups nichts verloren,
 *  auch wenn Kategorie/Tag/Intensität formal passen (QA 09.10.: easy_jog im
 *  Gym-Warmup). */
export const SPEED_FRAMING_SLUGS = new Set(['easy_jog', 'build_up_run'])

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
      // hätte der Warmup-Prompt einen leeren Drill-Pool. Die Rahmen-Übungen
      // der Sprint-Session (Traben etc.) bleiben draußen.
      if (ex.category_slug === 'sprints' && ex.sprint_type === null
        && !SPEED_FRAMING_SLUGS.has(ex.slug) && (ex.intensity_score ?? 10) <= 3) return true
      return PLYO_CATEGORIES.has(ex.category_slug) && ex.sprint_type === null && (ex.intensity_score ?? 10) <= 3
    case 'cooldown':
      return ex.category_slug === 'mobility' && legacyBlockAllows(ex, 'cooldown')
    default:
      return false
  }
}

// Welche Körperregionen ein Content-Block im Warmup vorbereitet bzw. im
// Cooldown ausgedehnt bekommt (09.10.: v1-Region-Matching nach v2 geholt).
// Accessory/Optional sind Filler und steuern den Rahmen bewusst nicht.
const BLOCK_PREP_REGIONS: Record<string, string[]> = {
  lower_body: ['hip', 'glute', 'hamstring', 'quad', 'groin', 'ankle', 'calf'],
  push: ['shoulder', 'chest', 'thoracic', 'tricep'],
  pull: ['upper_back', 'shoulder', 'neck', 'bicep'],
  core: ['core', 'hip', 'thoracic'],
  conditioning: ['full_body'],
}
const PLYO_PREP_REGIONS: Record<string, string[]> = {
  lower: ['ankle', 'calf', 'hip', 'hamstring'],
  upper: ['shoulder', 'chest', 'thoracic'],
}

/** Body-Regions der heutigen Content-Blöcke — Ziel für Warmup/Cooldown. */
export function sessionPrepRegions(blocks: PlannedWorkoutBlock[]): Set<string> {
  const regions = new Set<string>()
  for (const b of blocks) {
    if (b.block_type === 'plyo') {
      const variants = b.variant ? [b.variant] : Object.keys(PLYO_PREP_REGIONS)
      for (const v of variants) for (const r of PLYO_PREP_REGIONS[v] ?? []) regions.add(r)
    } else {
      for (const r of BLOCK_PREP_REGIONS[b.block_type] ?? []) regions.add(r)
    }
  }
  return regions
}

// Bevorzugt exercise_regions (10.10.): JEDE betroffene Region (primary wie
// secondary) zählt, full_body-Row ist Wildcard. Ohne regions-Daten greift die
// v1-Spalten-Semantik (filterByBodyRegion): full_body ohne dominant_region
// passt immer; mit dominant_region zählt die dominante Region; ungetaggt passt.
function matchesPrepRegions(ex: V2Exercise, regions: Set<string>): boolean {
  if (ex.regions && ex.regions.length > 0) {
    return ex.regions.some((r) => r.region === 'full_body' || regions.has(r.region))
  }
  if (!ex.body_region) return true
  if (ex.body_region === 'full_body') {
    return !ex.dominant_region || regions.has('full_body') || regions.has(ex.dominant_region)
  }
  return regions.has(ex.body_region)
}

export function buildBlockPools(
  exercises: V2Exercise[],
  blocks: PlannedWorkoutBlock[],
): Map<WorkoutBlockType, V2Exercise[]> {
  const prepRegions = sessionPrepRegions(blocks)
  const pools = new Map<WorkoutBlockType, V2Exercise[]>()
  for (const b of blocks) {
    let pool = exercises.filter((ex) => exerciseMatchesBlock(ex, b))
    // Review-Fix #1: Core-Varianten-Pools können bei jungem Katalog dünn sein —
    // unter 2 Übungen fällt der Block auf den ungefilterten Core-Pool zurück,
    // statt pre-gedroppt zu werden (Ebenen-Präferenz ist weich, §1.7).
    if (b.block_type === 'core' && b.variant && pool.length < 2) {
      pool = exercises.filter((ex) => exerciseMatchesBlock(ex, { ...b, variant: null }))
    }
    // Warmup/Cooldown zielen auf die heute trainierten Regionen (v1-Parität);
    // unter 2 Treffern bleibt der volle Pool, damit der Rahmen nie verhungert.
    if ((b.block_type === 'warmup' || b.block_type === 'cooldown') && prepRegions.size > 0) {
      const targeted = pool.filter((ex) => matchesPrepRegions(ex, prepRegions))
      if (targeted.length >= 2) pool = targeted
    }
    pools.set(b.block_type, pool)
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
