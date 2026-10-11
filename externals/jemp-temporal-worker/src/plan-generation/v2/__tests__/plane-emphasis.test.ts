import { describe, it, expect } from 'vitest'
import {
  DEFAULT_PLANE_WEIGHTS, PLANE_CYCLE_STRIDE,
  pickPlaneEmphasis, resolvePlaneWeights, toPatternFamily,
} from '../plane-emphasis'

const rows = (g: string, p: string, w: [number, number, number]) => [
  { group_name: g, pattern: p, plane: 'sagittal', weight: w[0] },
  { group_name: g, pattern: p, plane: 'frontal', weight: w[1] },
  { group_name: g, pattern: p, plane: 'transverse', weight: w[2] },
]

describe('toPatternFamily (Spec §1: push/pull auf Familien-Ebene)', () => {
  it('mappt die sechs Muster auf vier Familien', () => {
    expect(toPatternFamily('knee_dominant')).toBe('knee_dominant')
    expect(toPatternFamily('hinge')).toBe('hinge')
    expect(toPatternFamily('push_vertical')).toBe('push')
    expect(toPatternFamily('push_horizontal')).toBe('push')
    expect(toPatternFamily('pull_vertical')).toBe('pull')
    expect(toPatternFamily('pull_horizontal')).toBe('pull')
  })
})

describe('resolvePlaneWeights (Spec §2 Fallback)', () => {
  it('liefert die Gewichte der Gruppe pro Familie', () => {
    const w = resolvePlaneWeights(
      [...rows('combat_sports', 'push', [40, 0, 60]), ...rows('combat_sports', 'hinge', [60, 10, 30])],
      'combat_sports',
    )
    expect(w.push).toEqual({ sagittal: 40, frontal: 0, transverse: 60 })
    expect(w.hinge).toEqual({ sagittal: 60, frontal: 10, transverse: 30 })
  })

  it('partieller Seed: fehlende Familie → DEFAULT, vorhandene unverändert (Review Focus 2)', () => {
    const w = resolvePlaneWeights(rows('combat_sports', 'push', [40, 0, 60]), 'combat_sports')
    expect(w.push.transverse).toBe(60)
    expect(w.knee_dominant).toEqual(DEFAULT_PLANE_WEIGHTS)
    expect(w.pull).toEqual(DEFAULT_PLANE_WEIGHTS)
  })

  it('fehlende Gruppe / undefined → überall DEFAULT (heutiges Verhalten)', () => {
    expect(resolvePlaneWeights(rows('team_sports', 'push', [75, 0, 25]), 'combat_sports').push).toEqual(DEFAULT_PLANE_WEIGHTS)
    expect(resolvePlaneWeights([], undefined).hinge).toEqual(DEFAULT_PLANE_WEIGHTS)
  })
})

describe('pickPlaneEmphasis (Spec §3.2/§3.3)', () => {
  it('Verteilung über 10 Positionen entspricht den Gewichten', () => {
    const w = { sagittal: 40, frontal: 0, transverse: 60 }
    const picks = Array.from({ length: 10 }, (_, i) => pickPlaneEmphasis(w, i))
    expect(picks.filter((p) => p === 'transverse')).toHaveLength(6)
    expect(picks.filter((p) => p === 'sagittal')).toHaveLength(4)
    expect(picks.filter((p) => p === 'frontal')).toHaveLength(0)
  })

  it('alle Gewichte 0 → sagittal (kein Fokus, Review Focus 4)', () => {
    expect(pickPlaneEmphasis({ sagittal: 0, frontal: 0, transverse: 0 }, 3)).toBe('sagittal')
  })

  it('DEFAULT_PLANE_WEIGHTS → immer sagittal', () => {
    for (let i = 0; i < 10; i++) expect(pickPlaneEmphasis(DEFAULT_PLANE_WEIGHTS, i)).toBe('sagittal')
  })

  it('Position wrappt über die Zykluslänge', () => {
    const w = { sagittal: 50, frontal: 25, transverse: 25 }
    expect(pickPlaneEmphasis(w, 13)).toBe(pickPlaneEmphasis(w, 3))
  })

  it('Stride 3: zwei Vorkommen pro Woche überlappen zwischen Folgeplänen nicht (Spec §3.3)', () => {
    // Plan n belegt Positionen n*3 und n*3+1; Plan n+1 startet bei n*3+3.
    const plan0 = [0 * PLANE_CYCLE_STRIDE + 0, 0 * PLANE_CYCLE_STRIDE + 1]
    const plan1 = [1 * PLANE_CYCLE_STRIDE + 0, 1 * PLANE_CYCLE_STRIDE + 1]
    expect(new Set([...plan0, ...plan1]).size).toBe(4)
    // ggT(3,10)=1: ein Vorkommen/Woche durchläuft über 10 Pläne alle 10 Slots.
    const seen = new Set(Array.from({ length: 10 }, (_, plan) => (plan * PLANE_CYCLE_STRIDE) % 10))
    expect(seen.size).toBe(10)
  })
})
