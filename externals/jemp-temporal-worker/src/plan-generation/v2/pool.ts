// v2 pattern-block pool matching (spec §2.4, §6.2c). Pure.
// Metadata first; untagged exercises fall back to the coarse
// BODY_REGION_TO_PATTERN derivation so the partial backfill never
// empties a pool (phase 2b review focus 2).

import { BODY_REGION_TO_PATTERN, effectiveRegion } from '../taxonomy'
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
  /** dynamic | restorative | breathing (Mobility-Struktur, QA 11.10.) —
   *  optional, weil ältere Fixtures/Caller das Feld nicht setzen. */
  exercise_type?: string | null
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
  /** Gate (QA 10.10.): nur für die zugeordneten Sportgruppen sichtbar. */
  is_sport_specific?: boolean
  /** Sport-Präferenz (QA 10.10.): via exercise_sport_groups für die Gruppe des
   *  Users markiert — bekommt reservierte Fenster-Slots und steht im Prompt vorn. */
  preferred?: boolean
}

/** Rahmen-Übungen der Sprint-Session (Traben, Steigerungsläufe) — leben als
 *  Slug-Anker im Speed-Builder und haben in Workout-Warmups nichts verloren,
 *  auch wenn Kategorie/Tag/Intensität formal passen (QA 09.10.: easy_jog im
 *  Gym-Warmup). */
export const SPEED_FRAMING_SLUGS = new Set(['easy_jog', 'build_up_run'])

/** Kraftblock-Slugs inkl. Legacy (Review 20.10., geteilte Quelle): genutzt von
 *  fixInvalidLoads (Worker) UND derivePrescription/buildSwapPool (jemp-api,
 *  gebundelt) — vorher zwei wörtliche Kopien in zwei Deployables. */
export const STRENGTH_BLOCK_TYPES = new Set(['lower_strength', 'upper_strength', 'push', 'pull', 'lower_body'])

/** Blöcke, in denen Bodyweight-Reps-Arbeit AMRAP geht (Kraft + Core): ohne
 *  Zusatzlast gibt es keinen Intensitätsregler, eine feste Range ist dort
 *  willkürlich. Plyo/Warmup/Accessory bewusst NICHT — Explosiv- und
 *  Aktivierungsarbeit lebt fern des Versagens. Genutzt von
 *  flagAmrapExercises (Worker) UND derivePrescription (jemp-api, gebundelt). */
export const AMRAP_BLOCK_TYPES = new Set([...STRENGTH_BLOCK_TYPES, 'core'])

/** Alle strength_pattern-Enum-Werte (Review 20.10.): einmalige Quelle statt
 *  handgepflegter Listen — Achtung, NICHT verwechseln mit dem Coarse-
 *  ALL_PATTERNS (squat/hinge/push/pull) in generate-plan.ts. */
export const STRENGTH_PATTERNS = ['push_vertical', 'push_horizontal', 'pull_vertical', 'pull_horizontal', 'knee_dominant', 'hinge', 'rotation'] as const

/** Block-Typen, für die exerciseMatchesBlock echte Pool-Semantik hat (alles
 *  andere fällt auf default:false). Review 20.10.: Quelle neben dem Switch,
 *  App-Whitelist (helpers/swap-support.ts) wird per Worker-Test dagegen
 *  gepinnt — Cross-Repo-Drift bricht dann einen Test statt still die UI. */
export const SWAPPABLE_BLOCK_TYPES = ['warmup', 'cooldown', 'core', 'plyo', 'accessory', 'optional', 'lower_strength', 'upper_strength', 'push', 'pull', 'lower_body'] as const

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

/** Übung ↔ Kraftmuster (Spec 2026-10-10 §1.2): strength_pattern exakt, sonst
 *  Coarse-Fallback über Body-Region — Push/Pull-Fallback bleibt gegen das
 *  Isolations-Leck (QA 09.10.) abgedichtet. Von den Block-Typ-Cases UND den
 *  Pattern-Pools (strengthPatternPools) geteilt. */
export function matchesStrengthPattern(ex: V2Exercise, pattern: string): boolean {
  if (ex.strength_pattern !== null) return ex.strength_pattern === pattern
  if (ex.category_slug !== 'strength') return false
  const wanted = pattern === 'knee_dominant' ? 'squat' : pattern === 'hinge' ? 'hinge'
    : pattern.startsWith('push') ? 'push' : 'pull'
  if ((wanted === 'push' || wanted === 'pull') && OPTIONAL_REGIONS.has(effectiveRegion(ex) ?? '')) return false
  return coarsePattern(ex) === wanted
}

/** Pro gefordertem Pattern ein eigener Pool (für Prompt-Gruppierung + Validator). */
/** Prompt-Reihenfolge rotieren (QA 10.10.): LLMs greifen bevorzugt zu früh
 *  gelisteten Übungen — der planCount-Offset verschiebt pro Generierung, was
 *  „vorne" steht. Reine Darstellung: gleiche Menge, Validator-Sets unberührt. */
export function rotateSlugs(slugs: string[], offset: number): string[] {
  const sorted = [...slugs].sort()
  if (sorted.length === 0) return sorted
  const k = ((offset % sorted.length) + sorted.length) % sorted.length
  return [...sorted.slice(k), ...sorted.slice(0, k)]
}

/** Rotiertes Pool-Fenster für Füller-Blöcke (optional/accessory, QA 10.10.)
 *  und Plyo (groupBy movement_type): Das LLM konvergiert bei vollem Pool auf
 *  dieselben Favoriten — ein kleines, mit planCount rotierendes Fenster
 *  garantiert Abwechslung über Pläne hinweg. Gruppen-balanciert: Übungen
 *  werden pro Gruppe (default: Region) sortiert gruppiert und round-robin
 *  verschränkt, dann liest das Fenster ab Offset mit Wrap. */
export function rotatedPoolWindow(
  exercises: V2Exercise[], offset: number, size = 4,
  groupBy: (e: V2Exercise) => string = (e) => effectiveRegion(e) ?? 'other',
): V2Exercise[] {
  if (exercises.length <= size) return [...exercises].sort((a, b) => a.slug.localeCompare(b.slug))

  // Sport-Präferenz (QA 10.10.): bevorzugte Übungen bekommen reservierte Slots
  // (max. 2, rotierend falls mehr) — sie sind damit in JEDEM Fenster vertreten.
  const preferred = exercises.filter((e) => e.preferred).sort((a, b) => a.slug.localeCompare(b.slug))
  const reserveCount = Math.min(preferred.length, 2, size - 1)
  const picked: V2Exercise[] = []
  const used = new Set<string>()
  for (let i = 0; i < reserveCount; i++) {
    const e = preferred[(offset + i) % preferred.length]
    if (!used.has(e.slug)) { used.add(e.slug); picked.push(e) }
  }

  const byRegion = new Map<string, V2Exercise[]>()
  for (const e of [...exercises].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const r = groupBy(e)
    if (!byRegion.has(r)) byRegion.set(r, [])
    byRegion.get(r)!.push(e)
  }
  // Echtes Region-Round-Robin statt Ring-Slice: Position idx wählt Region
  // (idx % n) und darin die Schicht (idx / n) — so deckt jedes Fenster so viele
  // Regionen wie möglich ab, auch wenn die Gruppen ungleich groß sind.
  const regions = [...byRegion.keys()].sort()
  const safeOffset = ((offset % exercises.length) + exercises.length) % exercises.length
  for (let i = 0, guard = 0; picked.length < size && guard < exercises.length * 4; i++, guard++) {
    const idx = safeOffset + i
    const group = byRegion.get(regions[idx % regions.length])!
    const e = group[Math.floor(idx / regions.length) % group.length]
    if (!used.has(e.slug)) { used.add(e.slug); picked.push(e) }
  }
  return picked
}

/** Ebenen-Pin (Spec 2026-10-11 §4.2): erste Übung der Ziel-Ebene in rotierter
 *  Reihenfolge; Fallback andere nicht-sagittale; leerer Ebenen-Pool → null
 *  (kein Pin, Fenster wie heute — Datenlöcher erzwingen nie Effekte). */
export function pickPlanePin(pool: V2Exercise[], plane: string, offset: number): string | null {
  const target = rotateSlugs(pool.filter((e) => e.movement_type === plane).map((e) => e.slug), offset)
  if (target.length > 0) return target[0]
  const nonSagittal = rotateSlugs(pool.filter((e) => e.movement_type !== 'sagittal').map((e) => e.slug), offset)
  return nonSagittal[0] ?? null
}

/** Pattern-Pool fürs Prompt + Validator (QA 10.10.): schwere Patterns behalten
 *  den vollen Pool (Hauptlift-Stabilität), normale Patterns bekommen ein
 *  rotierendes 4er-Fenster — Sport-Präferenzen stehen immer vorn und fallen
 *  nie aus dem Fenster. planePin (Spec 2026-10-11 §4.2): die Ebenen-Übung wird
 *  als erster Pin gesetzt und ERSETZT den letzten preferred-Pin, statt das
 *  Fenster zu vergrößern — die Verknappung ist der Steuerungsmechanismus. */
export function patternSlugWindow(
  pool: V2Exercise[], emphasis: 'heavy' | 'normal', offset: number,
  planePin?: string | null, exclusiveSlugs?: Set<string>,
): string[] {
  // Heavy-Slot-Filter (QA 11.10.): Maximalkraft bleibt linear und schwer —
  // Rotations-/Frontal-Übungen und Activation (Int < 5) gehören in die
  // normal-Slots, nicht in den Schwerpunkt (rotational_cable_row 4×3-5 und
  // single_leg_glute_bridge neben 120-kg-RDL waren die Live-Befunde).
  // Unter 3 starken sagittalen Optionen bleibt der volle Pool (Datenloch).
  if (emphasis === 'heavy') {
    const strong = pool.filter((e) => e.movement_type === 'sagittal' && (e.intensity_score ?? 5) >= 5)
    if (strong.length >= 3) pool = strong
  }
  let pinned = pool.filter((e) => e.preferred).map((e) => e.slug).sort()
  // Gewichtetes Normal-Fenster (QA 19.10., Basketball-Befund): Score =
  // Intensität + Umgebungs-Exklusiv-Bonus, Rotation nur noch als Tiebreaker
  // innerhalb gleicher Scores. Die blinde Voll-Rotation spülte Activation-
  // Bänder (Int 4) vor die Hantel-Klassiker ins Gym-Fenster; jetzt rücken
  // sie nur nach, wenn davor nichts mehr ist (Home-/Band-only-Pools) — und
  // Übungen, die NUR in der heutigen Umgebung gehen, werden dort vorgezogen,
  // weil die anderen Tage sie nicht abdecken können.
  // Exklusiv-Bonus 0.5, nicht mehr (QA 19.10., Mixed-Befund): Er bricht nur
  // Gleichstände ("gleich stark → nimm die Nur-hier-Übung"), überspringt aber
  // nie eine Intensitätsstufe — mit +3 hob ein home-only-Band (Int 4) die
  // banded_squat über die Kurzhantel-Optionen (Int 6) des Home-Tags.
  const windowScore = (e: V2Exercise): number =>
    (e.intensity_score ?? 5) + (exclusiveSlugs?.has(e.slug) ? 0.5 : 0)
  const byScore = new Map<number, V2Exercise[]>()
  for (const e of pool.filter((x) => !x.preferred)) {
    const s = windowScore(e)
    if (!byScore.has(s)) byScore.set(s, [])
    byScore.get(s)!.push(e)
  }
  let rest: string[] = []
  for (const s of [...byScore.keys()].sort((a, b) => b - a)) {
    rest.push(...rotateSlugs(byScore.get(s)!.map((e) => e.slug), offset))
  }
  if (planePin && emphasis === 'normal') {
    if (pinned.includes(planePin)) {
      pinned = [planePin, ...pinned.filter((s) => s !== planePin)]
    } else {
      const displaced = pinned.length > 0 ? pinned[pinned.length - 1] : null
      pinned = [planePin, ...pinned.slice(0, -1)]
      rest = rest.filter((s) => s !== planePin)
      if (displaced) rest = [...rest, displaced] // ans Rest-Ende, nicht ins Nichts
    }
  }
  const all = [...pinned, ...rest]
  return emphasis === 'heavy' ? all : all.slice(0, Math.max(4, pinned.length))
}

export function strengthPatternPools(
  exercises: V2Exercise[],
  patterns: Array<{ pattern: string }>,
): Map<string, V2Exercise[]> {
  return new Map(patterns.map((p) => [p.pattern, exercises.filter((e) => matchesStrengthPattern(e, p.pattern))]))
}

/** CNS-Mikro-Dosis-Kandidaten (Dosierungs-Härtung 11.10.): Lauf-ABC-Drills
 *  (Kategorie 'sprints' ohne sprint_type, bis Int 4 — A-Skips/High Knees SIND
 *  Int 4, der alte ≤3-Deckel ließ den Drill-Pool verhungern) und explosive
 *  leichte Plyo. NICHT-explosive leichte Plyo (Leg Swings) ist Prep, kein
 *  CNS-Reiz. Rahmen-Übungen (Traben etc.) bleiben draußen. */
export function isCnsMicroDoseExercise(ex: V2Exercise): boolean {
  if (ex.sprint_type !== null || (ex.intensity_score ?? 10) > 4) return false
  if (ex.category_slug === 'sprints') return !SPEED_FRAMING_SLUGS.has(ex.slug)
  // COD-Drills (Carioca & Co.) nur mit EXPLIZITEM Warmup-Tag (QA 15.10.) —
  // legacyBlockAllows würde ungetaggte Drills durchwinken, hier trägt der
  // Tag bewusst die Semantik.
  if (ex.category_slug === 'cod') return ex.legacy_block_slugs?.includes('warmup') ?? false
  return PLYO_CATEGORIES.has(ex.category_slug) && ex.is_explosive
}

export function exerciseMatchesBlock(ex: V2Exercise, blockDef: PlannedWorkoutBlock): boolean {
  switch (blockDef.block_type) {
    case 'push':
    case 'pull':
    case 'lower_body':
      // Legacy-Blocktypen (Alt-Pläne/Übergang): Variante ist das Pattern.
      return blockDef.variant !== null && matchesStrengthPattern(ex, blockDef.variant)
    case 'lower_strength':
    case 'upper_strength':
      // Spec 2026-10-10 §1.2: der Block fordert eine Pattern-Liste.
      return (blockDef.patterns ?? []).some((p) => matchesStrengthPattern(ex, p.pattern))
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
      // Intensitäts-Floor (QA 10.10.): Leg Swings & Co. sind als Plyo kategorisiert,
      // aber Prep-Übungen — im Plyo-Block wirkungslos, seit dem Fenster sichtbar.
      if ((ex.intensity_score ?? 5) < 3) return false
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
      if (isCnsMicroDoseExercise(ex)) return true
      // Leichte nicht-explosive Plyo (Leg Swings & Co.) bleibt als Prep im
      // Warmup-Pool — sie erfüllt nur nicht die CNS-Anforderung.
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
  lower_strength: ['hip', 'glute', 'hamstring', 'quad', 'groin', 'ankle', 'calf'],
  push: ['shoulder', 'chest', 'thoracic', 'tricep'],
  pull: ['upper_back', 'shoulder', 'neck', 'bicep'],
  // Union aus Push- und Pull-Regionen (Spec 2026-10-10 §4)
  upper_strength: ['shoulder', 'chest', 'thoracic', 'tricep', 'upper_back', 'neck', 'bicep'],
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
