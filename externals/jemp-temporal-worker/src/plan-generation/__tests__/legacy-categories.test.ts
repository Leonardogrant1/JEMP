import { describe, it, expect } from 'vitest'
import { freezeLegacyCategories, freezeLegacySportCategories } from '../legacy-categories'

describe('freezeLegacyCategories', () => {
  it('filters post-step-4 pillar rows down to the legacy category set', () => {
    const rows = [
      { category: 'strength', relevance: 2 },
      { category: 'sprints', relevance: 2 },
      { category: 'cod', relevance: 2 },
      { category: 'conditioning', relevance: 1 },
      { category: 'lower_body_plyometrics', relevance: 2 },
      { category: 'mobility', relevance: 1 },
    ]
    expect(freezeLegacyCategories(rows).map((r) => r.category)).toEqual(
      ['strength', 'lower_body_plyometrics', 'mobility'])
  })
  it('passes the pre-step-4 world through unchanged', () => {
    const rows = [{ category: 'jumps', relevance: 2 }, { category: 'strength', relevance: 3 }]
    expect(freezeLegacyCategories(rows)).toEqual(rows)
  })
})

describe('freezeLegacySportCategories (review fix I1)', () => {
  it('additionally drops relevance-0 rows — a shape the legacy path never saw', () => {
    const rows = [
      { category: 'strength', relevance: 2 },
      { category: 'upper_body_plyometrics', relevance: 0 },
      { category: 'sprints', relevance: 2 },
      { category: 'mobility', relevance: 1 },
    ]
    expect(freezeLegacySportCategories(rows).map((r) => r.category)).toEqual(['strength', 'mobility'])
  })
})
