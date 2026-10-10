import { describe, it, expect } from 'vitest'
import {
  buildFormatCycle, pickSessionFormat, pickFinisherFormat,
  resolveConditioningWeights, DEFAULT_CONDITIONING_WEIGHTS,
} from '../conditioning-format'

describe('buildFormatCycle (Spec §3.2)', () => {
  it('team_sports 40/55/5 → Spec-Beispiel, rounds in der Zyklus-Mitte', () => {
    expect(buildFormatCycle({ extensive: 40, intensive: 55, rounds: 5 }))
      .toEqual(['intensive', 'extensive', 'intensive', 'extensive', 'rounds',
                'intensive', 'extensive', 'intensive', 'extensive', 'intensive'])
  })
  it('weight 0 erscheint nie im Zyklus', () => {
    expect(buildFormatCycle({ extensive: 50, intensive: 50, rounds: 0 })).not.toContain('rounds')
  })
  it('Remainder-Gleichstand: kleineres Gewicht gewinnt (rounds 5 → genau 1 Slot)', () => {
    const cycle = buildFormatCycle({ extensive: 40, intensive: 55, rounds: 5 })
    expect(cycle.filter((f) => f === 'rounds')).toHaveLength(1)
    expect(cycle.filter((f) => f === 'intensive')).toHaveLength(5)
    expect(cycle.filter((f) => f === 'extensive')).toHaveLength(4)
  })
  it('alle Gewichte 0 → reiner intensive-Zyklus (defensiv)', () => {
    expect(buildFormatCycle({ extensive: 0, intensive: 0, rounds: 0 })).toEqual(Array(10).fill('intensive'))
  })
})

describe('pickSessionFormat', () => {
  const w = { extensive: 40, intensive: 55, rounds: 5 }
  it('rotiert deterministisch über planCount % 10', () => {
    expect(pickSessionFormat(w, 0)).toBe('intensive')
    expect(pickSessionFormat(w, 4)).toBe('rounds')
    expect(pickSessionFormat(w, 14)).toBe('rounds') // Wrap
  })
})

describe('pickFinisherFormat (Spec §3.4)', () => {
  it('rounds nur bei striktem Übergewicht, Gleichstand → intensive', () => {
    expect(pickFinisherFormat({ extensive: 25, intensive: 25, rounds: 50 })).toBe('rounds')
    expect(pickFinisherFormat({ extensive: 40, intensive: 55, rounds: 5 })).toBe('intensive')
    expect(pickFinisherFormat({ extensive: 50, intensive: 25, rounds: 25 })).toBe('intensive')
  })
})

describe('resolveConditioningWeights (Review Focus 4)', () => {
  const rows = [
    { group_name: 'combat_sports', format: 'extensive', weight: 25 },
    { group_name: 'combat_sports', format: 'intensive', weight: 25 },
    { group_name: 'combat_sports', format: 'rounds', weight: 50 },
    { group_name: 'other', format: 'extensive', weight: 40 },
    { group_name: 'other', format: 'intensive', weight: 50 },
    { group_name: 'other', format: 'rounds', weight: 10 },
  ]
  it('findet die Gruppe', () => {
    expect(resolveConditioningWeights(rows, 'combat_sports')).toEqual({ extensive: 25, intensive: 25, rounds: 50 })
  })
  it('unbekannte Gruppe → other-Zeilen', () => {
    expect(resolveConditioningWeights(rows, 'esports')).toEqual({ extensive: 40, intensive: 50, rounds: 10 })
  })
  it('leere Tabelle → Konstante', () => {
    expect(resolveConditioningWeights([], undefined)).toEqual(DEFAULT_CONDITIONING_WEIGHTS)
  })
})
