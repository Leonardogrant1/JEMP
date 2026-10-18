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

import { codMicroCnsPool } from '../prepare-v2'

describe('codMicroCnsPool (QA 18.10.: COD-Fokus ohne Speed-Tag → Mikro-Dosis)', () => {
  const full = ['a_skip_drill', 'high_knees', 'carioca']
  const cod = ['carioca']

  it('verengt die CNS-Dosis auf COD-Drills: cod >= 2, kein Speed-Tag, erste zwei Sessions', () => {
    expect(codMicroCnsPool(full, cod, 2, false, 0)).toEqual(['carioca'])
    expect(codMicroCnsPool(full, cod, 3, false, 1)).toEqual(['carioca'])
  })

  it('ab der dritten Session gilt wieder der volle Pool (Dosis, kein Dauerprogramm)', () => {
    expect(codMicroCnsPool(full, cod, 2, false, 2)).toEqual(full)
  })

  it('mit Speed-Tag oder cod <= 1 bleibt alles unverändert', () => {
    expect(codMicroCnsPool(full, cod, 2, true, 0)).toEqual(full)
    expect(codMicroCnsPool(full, cod, 1, false, 0)).toEqual(full)
  })

  it('ohne qualifizierte COD-Drills bleibt der volle Pool (Datenloch erzwingt nie Leere)', () => {
    expect(codMicroCnsPool(full, [], 2, false, 0)).toEqual(full)
  })
})
