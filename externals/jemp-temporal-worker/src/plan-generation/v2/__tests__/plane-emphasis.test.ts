import { describe, it, expect } from 'vitest'
import {
  DEFAULT_PLANE_WEIGHTS, PLANE_CYCLE_STRIDE,
  makePlaneCounter, pickPlaneEmphasis, resolvePlaneWeights, toPatternFamily,
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

describe('makePlaneCounter (Spec §3.3: position = planCount*3 + k, pro Familie)', () => {
  it('zählt pro Familie unabhängig und mit Stride-Basis', () => {
    const next = makePlaneCounter(2) // planCount 2 → Basis 6
    expect(next('knee_dominant')).toBe(6)
    expect(next('knee_dominant')).toBe(7)
    expect(next('push')).toBe(6)    // eigener Zähler
    expect(next('knee_dominant')).toBe(8)
  })
  it('planCount 0 startet bei 0', () => {
    expect(makePlaneCounter(0)('hinge')).toBe(0)
  })
})

// Review-Fix (Final Review Important #1): die Pin-Entscheidung ist als pure
// Funktion aus prepare-v2 extrahiert und hier gepinnt — insbesondere, dass
// heavy den Wochen-Zähler NICHT konsumiert und der Zähler geteilt ist.
import { fillerWindowOffset, planeFocusForPattern } from '../prepare-v2'

describe('planeFocusForPattern (prepare-v2-Verdrahtung, Spec §4)', () => {
  const pl = (slug: string, movement_type: string) => ({
    id: slug, slug, name: slug, category_slug: 'strength', body_region: 'quad',
    dominant_region: null, strength_pattern: 'knee_dominant', plyo_type: null,
    core_type: null, sprint_type: null, covered_patterns: null, laterality: 'bilateral',
    min_level: 1, max_level: 100, intensity_score: 5, measurement_type: 'reps',
    legacy_block_slugs: null, movement_type, is_explosive: false, regions: null,
  }) as any
  const pool = [pl('back_squat', 'sagittal'), pl('kb_split_squat_rotation', 'transverse')]
  const weights = {
    knee_dominant: { sagittal: 0, frontal: 0, transverse: 100 },
    hinge: DEFAULT_PLANE_WEIGHTS, push: DEFAULT_PLANE_WEIGHTS, pull: DEFAULT_PLANE_WEIGHTS,
  }

  it('normal + Ebenen-Slot → Pin und Fokus; Zähler wird konsumiert', () => {
    const next = makePlaneCounter(0)
    const r = planeFocusForPattern('knee_dominant', 'normal', weights, next, pool)
    expect(r).toEqual({ planePin: 'kb_split_squat_rotation', planeFocus: 'transverse' })
    expect(next('knee_dominant')).toBe(1) // Position 0 wurde verbraucht
  })

  it('heavy konsumiert den Zähler NICHT und pinnt nie', () => {
    const next = makePlaneCounter(0)
    const r = planeFocusForPattern('knee_dominant', 'heavy', weights, next, pool)
    expect(r).toEqual({ planePin: null })
    expect(next('knee_dominant')).toBe(0) // Zähler unberührt
  })

  it('sagittal-Zyklus-Slot → kein Pin, Zähler trotzdem konsumiert (Position zählt pro Vorkommen)', () => {
    const next = makePlaneCounter(0)
    const r = planeFocusForPattern('knee_dominant', 'normal',
      { ...weights, knee_dominant: DEFAULT_PLANE_WEIGHTS }, next, pool)
    expect(r).toEqual({ planePin: null })
    expect(next('knee_dominant')).toBe(1)
  })

  it('leerer Ebenen-Pool → kein Fokus trotz Ebenen-Slot (Datenloch degradiert)', () => {
    const next = makePlaneCounter(0)
    const onlySagittal = [pl('back_squat', 'sagittal')]
    const r = planeFocusForPattern('knee_dominant', 'normal', weights, next, onlySagittal)
    expect(r).toEqual({ planePin: null })
  })

  it('Zähler ist über Muster derselben Familie geteilt (push_vertical + push_horizontal)', () => {
    const next = makePlaneCounter(0)
    const pushWeights = { ...weights, push: { sagittal: 50, frontal: 0, transverse: 50 } }
    planeFocusForPattern('push_vertical', 'normal', pushWeights, next, pool)
    expect(next('push')).toBe(1) // zweites Vorkommen der Familie sieht Position 1
  })
})

describe('Füller-Fenster & Pin pro Session (QA 11.10.)', () => {
  it('fillerWindowOffset: Session-Ordinale springen in Fenstergrößen-Schritten (QA 18.10.)', () => {
    // Konsekutive Sessions rücken die Schicht um genau ein Fenster weiter —
    // sonst wählt das Regionen-Round-Robin dieselbe Übungs-Schicht erneut.
    expect(fillerWindowOffset(0, 1) - fillerWindowOffset(0, 0)).toBe(4)
    expect(fillerWindowOffset(0, 2) - fillerWindowOffset(0, 1)).toBe(4)
    expect(fillerWindowOffset(0, 5)).not.toBe(fillerWindowOffset(1, 0))
    expect(fillerWindowOffset(2, 1)).toBe(2 * 29 + 4)
  })

  it('Plane-Pin rotiert pro Vorkommen: zwei gleiche Muster in einer Woche pinnen verschiedene Übungen', () => {
    const mk = (slug: string) => ({
      id: slug, slug, name: slug, category_slug: 'strength', body_region: 'quad',
      dominant_region: null, strength_pattern: 'knee_dominant', plyo_type: null,
      core_type: null, sprint_type: null, covered_patterns: null, laterality: 'bilateral',
      min_level: 1, max_level: 100, intensity_score: 5, measurement_type: 'reps',
      legacy_block_slugs: null, movement_type: 'transverse', is_explosive: false, regions: null,
    }) as any
    const pool = [mk('kb_split_squat_rotation'), mk('curtsy_rotation_x')]
    const weights = {
      knee_dominant: { sagittal: 0, frontal: 0, transverse: 100 },
      hinge: DEFAULT_PLANE_WEIGHTS, push: DEFAULT_PLANE_WEIGHTS, pull: DEFAULT_PLANE_WEIGHTS,
    }
    const next = makePlaneCounter(0)
    const first = planeFocusForPattern('knee_dominant', 'normal', weights, next, pool)
    const second = planeFocusForPattern('knee_dominant', 'normal', weights, next, pool)
    expect(first.planePin).not.toBe(second.planePin)
  })
})
