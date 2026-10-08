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
