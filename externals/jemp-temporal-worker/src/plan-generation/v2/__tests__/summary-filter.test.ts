import { describe, it, expect } from 'vitest'
import { isSummaryBlock } from '../../../workflows/summary-filter'

describe('isSummaryBlock (review fix I1)', () => {
  it('keeps legacy main blocks and v2 pattern blocks, drops warmup/cooldown', () => {
    for (const bt of ['primary', 'secondary', 'accessory', 'push', 'pull', 'lower_body', 'rotation', 'core', 'plyo', 'sprint']) {
      expect(isSummaryBlock(bt)).toBe(true)
    }
    expect(isSummaryBlock('warmup')).toBe(false)
    expect(isSummaryBlock('cooldown')).toBe(false)
  })
})
