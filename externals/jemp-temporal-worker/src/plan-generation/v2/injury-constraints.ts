// Pure Kern-Modul für Verletzungs-Constraints: baut aus aktiven Constraints eines Users
// (tag_slug + Modus) die Ausschluss-Sets für den Generator/Pool/Swap. Keine IO.

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
