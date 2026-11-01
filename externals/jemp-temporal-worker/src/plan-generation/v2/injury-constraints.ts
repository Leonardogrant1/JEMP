// Pure Kern-Modul für Verletzungs-Constraints: baut aus aktiven Constraints eines Users
// (tag_slug + Modus) die Ausschluss-Sets für den Generator/Pool/Swap. Keine IO.

import type { PillarLevels, PillarSlug } from '../week-layout'

export type InjuryConstraintInput = {
  tag_slug: string
  mode: 'block' | 'light_only'
  acute: boolean
}

export type InjuryExclusions = {
  blockedIds: Set<string> // exercise ids, Modus block
  lightOnlyIds: Set<string> // exercise ids, Modus light_only (block gewinnt bei Konflikt)
  acute: boolean // mind. ein aktiver acute-Constraint
}

// DB-Row-Form (Supabase-Embedded-Select, Task 4): mappt auf InjuryConstraintInput,
// nur aktive Constraints (nicht revoked, bereits confirmed, Tag vorhanden).
export type InjuryConstraintRow = {
  mode: 'block' | 'light_only'
  acute: boolean
  revoked_at: string | null
  confirmed_at: string | null
  contraindication_tags: { slug: string } | null
}

export function activeInjuryConstraints(rows: InjuryConstraintRow[]): InjuryConstraintInput[] {
  const result: InjuryConstraintInput[] = []
  for (const row of rows) {
    if (row.revoked_at !== null) continue
    if (row.confirmed_at === null) continue
    if (row.contraindication_tags === null) continue
    result.push({
      tag_slug: row.contraindication_tags.slug,
      mode: row.mode,
      acute: row.acute,
    })
  }
  return result
}

export function buildInjuryExclusions(
  constraints: InjuryConstraintInput[],
  tagsByExercise: Map<string, Set<string>>,
): InjuryExclusions {
  const blockTagSlugs = new Set(
    constraints.filter((c) => c.mode === 'block').map((c) => c.tag_slug),
  )
  const lightOnlyTagSlugs = new Set(
    constraints.filter((c) => c.mode === 'light_only').map((c) => c.tag_slug),
  )
  const acute = constraints.some((c) => c.acute)

  const blockedIds = new Set<string>()
  const lightOnlyIds = new Set<string>()

  for (const [exerciseId, tags] of tagsByExercise) {
    let blocked = false
    for (const tag of tags) {
      if (blockTagSlugs.has(tag)) {
        blockedIds.add(exerciseId)
        blocked = true
        break
      }
    }
    if (blocked) continue
    for (const tag of tags) {
      if (lightOnlyTagSlugs.has(tag)) {
        lightOnlyIds.add(exerciseId)
        break
      }
    }
  }

  return { blockedIds, lightOnlyIds, acute }
}

// Für Pools, die bereits als Exercise-Arrays vorliegen (Swap, Task 7):
// entfernt blockedIds; lightOnly bleibt (Heavy-Ausschluss macht der Aufrufer)
export function applyInjuryExclusions<T extends { id: string }>(
  pool: T[],
  exclusions: InjuryExclusions,
): T[] {
  return pool.filter((item) => !exclusions.blockedIds.has(item.id))
}

// Task 5 Chokepoint: EINMAL auf die rohen exerciseRows angewandt, bevor
// prepare-v2 daraus die vier Pool-Ableitungen (Basis/Env-Cache/Speed/
// slugsForEnv) baut — damit eine blockierte Übung in KEINER Ableitung mehr
// auftaucht, statt an jeder Ableitungsstelle einzeln gefiltert zu werden.
// Gleiche Semantik wie applyInjuryExclusions (blockedIds raus, lightOnly
// bleibt — der Heavy-Ausschluss lebt in patternSlugWindow/buildBlockPools),
// nur generisch auf rohe DB-Row-Typen benannt statt auf fertige V2Exercise.
export function filterRowsByInjury<T extends { id: string }>(
  rows: T[],
  exclusions: InjuryExclusions,
): T[] {
  return applyInjuryExclusions(rows, exclusions)
}

// ── Task 7: Sichtbarkeit (Spec §5) ──────────────────────────────────────────
// injury_adjusted + injury_conflicts werden auf workout_plans persistiert,
// damit die App "an deine Einschränkungen angepasst" + Prio-Konflikt-
// Hinweise zeigen kann (Task 8), ohne die Exclusions erneut zu berechnen.

// true, wenn mind. eine blockierte oder light_only-Übung tatsächlich im
// aktuellen Exercise-Universum (exerciseRows) vorkommt — leere Exclusions
// (keine aktiven Constraints) bleiben der bisherige No-Op (false).
export function computeInjuryAdjusted<T extends { id: string }>(
  exclusions: InjuryExclusions,
  exerciseRows: T[],
): boolean {
  if (exclusions.blockedIds.size === 0 && exclusions.lightOnlyIds.size === 0) return false
  return exerciseRows.some((row) => exclusions.blockedIds.has(row.id) || exclusions.lightOnlyIds.has(row.id))
}

// Minimale Row-Form für die Pool-Prädikate (dieselben Felder, die prepare-v2
// schon im exercises-Select lädt — kein zusätzlicher Query-Bedarf).
export type V2ExerciseRow = {
  sprint_type: string | null
  plyo_type: string | null
  strength_pattern: string | null
}

type PillarPoolPredicate = (row: V2ExerciseRow) => boolean

// Nur die vier Säulen mit einem direkten, feldbasierten Pool-Prädikat
// (Spec §5) — cod/conditioning/mobility haben keine 1:1-Felder und bleiben
// hier unberücksichtigt, selbst auf Level 3.
const PILLAR_POOL_PREDICATES: Partial<Record<PillarSlug, PillarPoolPredicate>> = {
  sprints: (row) => row.sprint_type !== null,
  lower_body_plyometrics: (row) => row.plyo_type === 'lower',
  upper_body_plyometrics: (row) => row.plyo_type === 'upper',
  strength: (row) => row.strength_pattern !== null,
}

const PRIORITY_LEVEL = 3

/** Prio-Konflikt-Erkennung (Spec §5): nur Säulen mit Level 3 (Prio-1), deren
 *  Pool durch die Exclusions leer ('pool_emptied') oder stark reduziert
 *  ('pool_reduced': unter 3 Übungen ODER höchstens die Hälfte des
 *  Vorher-Pools) wird. `before`/`after` sind dieselben rohen exerciseRows
 *  vor/nach filterRowsByInjury — ein von vornherein leerer Pool (Datenloch,
 *  nicht constraint-bedingt) löst keinen Konflikt aus. */
export function detectPriorityConflicts(
  before: V2ExerciseRow[],
  after: V2ExerciseRow[],
  pillarLevels: PillarLevels,
): { pillar: string; reason: 'pool_emptied' | 'pool_reduced' }[] {
  const conflicts: { pillar: string; reason: 'pool_emptied' | 'pool_reduced' }[] = []
  for (const [pillar, predicate] of Object.entries(PILLAR_POOL_PREDICATES) as Array<[PillarSlug, PillarPoolPredicate]>) {
    if (pillarLevels[pillar] !== PRIORITY_LEVEL) continue
    const beforeCount = before.filter(predicate).length
    if (beforeCount === 0) continue
    const afterCount = after.filter(predicate).length
    if (afterCount === 0) {
      conflicts.push({ pillar, reason: 'pool_emptied' })
    } else if (afterCount < 3 || afterCount <= beforeCount * 0.5) {
      conflicts.push({ pillar, reason: 'pool_reduced' })
    }
  }
  return conflicts
}
