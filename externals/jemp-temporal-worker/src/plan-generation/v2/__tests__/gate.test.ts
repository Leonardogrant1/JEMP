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
