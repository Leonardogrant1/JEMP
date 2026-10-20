import { describe, expect, it } from 'vitest'
import { SWAPPABLE_BLOCK_TYPES } from '../pool'
import { SWAP_SUPPORTED_BLOCKS } from '../../../../../../helpers/swap-support'

// Cross-Repo-Pin (Review 20.10.): Die App-Whitelist (Swap-Icon sichtbar?) und
// die Worker-Quelle neben exerciseMatchesBlock müssen identisch bleiben —
// Drift versteckte sonst still das Icon für Block-Typen, die der Swap-Pool
// längst unterstützt (oder zeigte es für Dead-End-Blöcke).
describe('SWAP_SUPPORTED_BLOCKS ↔ SWAPPABLE_BLOCK_TYPES', () => {
  it('App-Whitelist und Worker-Liste sind mengengleich', () => {
    expect(new Set(SWAP_SUPPORTED_BLOCKS)).toEqual(new Set(SWAPPABLE_BLOCK_TYPES))
  })
})
