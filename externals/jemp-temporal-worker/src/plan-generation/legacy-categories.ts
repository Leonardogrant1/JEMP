// The legacy generator's world view is frozen to the pre-pillar categories:
// after the §6.1-step-4 data migration the relevance table carries 7 pillar
// rows, but the legacy path must never plan sprints/cod/conditioning blocks
// (untested drift). The v2 path sees the full pillar view.
const LEGACY_CATEGORY_SLUGS = new Set([
  'strength', 'lower_body_plyometrics', 'upper_body_plyometrics', 'mobility', 'jumps',
])

export function freezeLegacyCategories<T extends { category: string }>(rows: T[]): T[] {
  return rows.filter((r) => LEGACY_CATEGORY_SLUGS.has(r.category))
}

/** Sport-relevance view for the legacy path: frozen slugs AND no relevance-0
 *  rows — the preset matrix introduced 0 ("pillar hidden"), a value the legacy
 *  prompt/capability logic has never seen (phase-3a review fix I1). */
export function freezeLegacySportCategories<T extends { category: string; relevance: number }>(rows: T[]): T[] {
  return freezeLegacyCategories(rows).filter((r) => r.relevance > 0)
}
