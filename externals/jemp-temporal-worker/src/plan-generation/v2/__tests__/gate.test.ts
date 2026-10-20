import { describe, it, expect } from 'vitest'
import { shouldUseV2 } from '../prepare-v2'

describe('activation gate (§6.5)', () => {
  it('prefers legacy when levels are not wizard-set', () => {
    expect(shouldUseV2([{ set_by_wizard: false }, { set_by_wizard: false }])).toBe(false)
  })
  it('activates v2 only on wizard-set levels', () => {
    expect(shouldUseV2([{ set_by_wizard: false }, { set_by_wizard: true }])).toBe(true)
    expect(shouldUseV2([])).toBe(false)
  })
})

import { parseDayDurations } from '../prepare-v2'

describe('parseDayDurations (review focus 5: JSONB shape)', () => {
  it('accepts the canonical shape', () => {
    expect(parseDayDurations([{ day_of_week: 1, minutes: 45 }, { day_of_week: 4, minutes: 90 }]))
      .toEqual([{ day_of_week: 1, minutes: 45 }, { day_of_week: 4, minutes: 90 }])
  })
  it('rejects malformed entries and empty/invalid input', () => {
    expect(parseDayDurations(null)).toBeUndefined()
    expect(parseDayDurations('nope')).toBeUndefined()
    expect(parseDayDurations([{ day_of_week: 8, minutes: 45 }])).toBeUndefined()
    expect(parseDayDurations([{ day_of_week: 2, minutes: 0 }])).toBeUndefined()
    expect(parseDayDurations([])).toBeUndefined()
  })
})
