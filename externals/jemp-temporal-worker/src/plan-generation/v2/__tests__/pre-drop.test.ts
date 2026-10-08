import { describe, it, expect } from 'vitest'
import { preDropEmptyPools } from '../pool'

describe('preDropEmptyPools (review fix I2)', () => {
  const workout = (): any => ({
    day_of_week: 1,
    blocks: [
      { block_type: 'warmup', variant: null, emphasis: 'normal' },
      { block_type: 'push', variant: 'push_vertical', emphasis: 'normal' },
      { block_type: 'rotation', variant: null, emphasis: 'normal' },
      { block_type: 'cooldown', variant: null, emphasis: 'normal' },
    ],
    dropped: [], estimated_minutes: 40,
  })

  it('drops blocks whose pool is empty with reason coverage', () => {
    const w = workout()
    const notes = preDropEmptyPools(w, { warmup: ['hip_cars'], push: ['bench_press'], rotation: [], cooldown: ['hip_cars'] })
    expect(w.blocks.map((b: any) => b.block_type)).toEqual(['warmup', 'push', 'cooldown'])
    expect(w.dropped).toEqual([{ block_type: 'rotation', reason: 'coverage' }])
    expect(notes.join(' ')).toMatch(/rotation/)
  })
  it('never drops warmup or cooldown even when empty', () => {
    const w = workout()
    preDropEmptyPools(w, { warmup: [], push: ['bench_press'], rotation: ['cable_chop'], cooldown: [] })
    expect(w.blocks.map((b: any) => b.block_type)).toContain('warmup')
    expect(w.blocks.map((b: any) => b.block_type)).toContain('cooldown')
  })
})
