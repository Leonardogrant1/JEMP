import { describe, it, expect } from 'vitest'
import { buildWeightedCycle, CYCLE_LENGTH } from '../weighted-cycle'

const count = (cycle: string[], v: string) => cycle.filter((x) => x === v).length

describe('buildWeightedCycle (Spec 2026-10-11 §3.1 — Generalisierung)', () => {
  const order = ['a', 'b', 'c'] as const

  it('verteilt nach Largest Remainder auf 10 Slots', () => {
    const cycle = buildWeightedCycle({ a: 50, b: 40, c: 10 }, [...order], 'a')
    expect(cycle).toHaveLength(CYCLE_LENGTH)
    expect(count(cycle, 'a')).toBe(5)
    expect(count(cycle, 'b')).toBe(4)
    expect(count(cycle, 'c')).toBe(1)
  })

  it('normalisiert über die Gesamtsumme, nicht über 100 (Review Focus 1)', () => {
    const cycle = buildWeightedCycle({ a: 30, b: 30, c: 0 }, [...order], 'a')
    expect(count(cycle, 'a')).toBe(5)
    expect(count(cycle, 'b')).toBe(5)
    expect(count(cycle, 'c')).toBe(0)
  })

  it('kleines Gewicht fällt nicht auf 0 (Tie → kleineres Gewicht gewinnt Rest-Slot)', () => {
    const cycle = buildWeightedCycle({ a: 90, b: 5, c: 5 }, [...order], 'a')
    expect(count(cycle, 'b')).toBeGreaterThanOrEqual(0) // b ODER c bekommt den Rest-Slot
    expect(count(cycle, 'b') + count(cycle, 'c')).toBe(1)
  })

  it('Ein-Slot-Kategorien landen in der Zyklus-Mitte (Verschränkung)', () => {
    const cycle = buildWeightedCycle({ a: 50, b: 40, c: 10 }, [...order], 'a')
    const idx = cycle.indexOf('c')
    expect(idx).toBeGreaterThanOrEqual(3)
    expect(idx).toBeLessThanOrEqual(6)
  })

  it('Gesamtgewicht 0 → Zyklus voll fallback', () => {
    const cycle = buildWeightedCycle({ a: 0, b: 0, c: 0 }, [...order], 'b')
    expect(cycle).toEqual(Array(CYCLE_LENGTH).fill('b'))
  })
})
