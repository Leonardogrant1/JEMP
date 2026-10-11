// Bewegungsebenen-Betonung (Spec 2026-10-11): Gewichte je Sportgruppe und
// Muster-Familie → 10-Slot-Zyklus → deterministische Ebene pro Vorkommen.
// Pure, kein IO.

import { buildWeightedCycle, CYCLE_LENGTH } from './weighted-cycle'

export type Plane = 'sagittal' | 'frontal' | 'transverse'
export type PlaneWeights = Record<Plane, number>
export type PatternFamily = 'knee_dominant' | 'hinge' | 'push' | 'pull'

const PLANES: Plane[] = ['sagittal', 'frontal', 'transverse']
export const FAMILIES: PatternFamily[] = ['knee_dominant', 'hinge', 'push', 'pull']

/** Neutraler Default (Spec §2): Datenlöcher verhalten sich wie heute — nie
 *  Fenster verengen. Bewusst KEIN 'other'-Fallback wie beim Conditioning. */
export const DEFAULT_PLANE_WEIGHTS: PlaneWeights = { sagittal: 100, frontal: 0, transverse: 0 }

/** Zyklusposition = planCount * STRIDE + Vorkommens-Index (Spec §3.3):
 *  Stride 3 beseitigt den Überlapp bei 2 Vorkommen/Woche, und ggT(3, 10) = 1
 *  garantiert volle Zyklusabdeckung bei 1 Vorkommen/Woche. */
export const PLANE_CYCLE_STRIDE = 3

/** push_vertical|push_horizontal → push usw. — ein rotationales Drücken
 *  ersetzt vertikal wie horizontal (Spec §1). */
export function toPatternFamily(pattern: string): PatternFamily {
  if (pattern === 'knee_dominant' || pattern === 'hinge') return pattern
  return pattern.startsWith('push') ? 'push' : 'pull'
}

export function resolvePlaneWeights(
  rows: Array<{ group_name: string; pattern: string; plane: string; weight: number }>,
  groupName: string | undefined,
): Record<PatternFamily, PlaneWeights> {
  const result = {} as Record<PatternFamily, PlaneWeights>
  for (const fam of FAMILIES) {
    const g = groupName ? rows.filter((r) => r.group_name === groupName && r.pattern === fam) : []
    if (g.length === 0) { result[fam] = DEFAULT_PLANE_WEIGHTS; continue }
    const w: PlaneWeights = { sagittal: 0, frontal: 0, transverse: 0 }
    for (const p of PLANES) w[p] = g.find((r) => r.plane === p)?.weight ?? 0
    result[fam] = w
  }
  return result
}

export function pickPlaneEmphasis(weights: PlaneWeights, position: number): Plane {
  const cycle = buildWeightedCycle(weights, PLANES, 'sagittal')
  return cycle[((position % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH]
}
