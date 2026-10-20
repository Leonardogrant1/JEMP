// Conditioning-Format-Logik (Spec 2026-10-10 §3): Gewichte → 10-Slot-Zyklus →
// deterministische Rotation über planCount. Pure, kein IO.

import { buildWeightedCycle, CYCLE_LENGTH } from './weighted-cycle'

export type ConditioningFormat = 'extensive' | 'intensive' | 'rounds'
export type ConditioningWeights = Record<ConditioningFormat, number>

const FORMATS: ConditioningFormat[] = ['extensive', 'intensive', 'rounds']

/** Fallback = other-Seed (Spec §2): greift nur, wenn die Tabelle leer/unerreichbar ist. */
export const DEFAULT_CONDITIONING_WEIGHTS: ConditioningWeights = { extensive: 40, intensive: 50, rounds: 10 }

export function resolveConditioningWeights(
  rows: Array<{ group_name: string; format: string; weight: number }>,
  groupName: string | undefined,
): ConditioningWeights {
  const pick = (group: string): ConditioningWeights | null => {
    const g = rows.filter((r) => r.group_name === group)
    if (g.length === 0) return null
    const w = { ...DEFAULT_CONDITIONING_WEIGHTS }
    for (const f of FORMATS) w[f] = g.find((r) => r.format === f)?.weight ?? 0
    return w
  }
  return (groupName ? pick(groupName) : null) ?? pick('other') ?? DEFAULT_CONDITIONING_WEIGHTS
}

/** Delegiert an den generischen Zyklus (Spec 2026-10-11 §3.1) — Verhalten
 *  identisch zur früheren Inline-Implementierung. */
export function buildFormatCycle(weights: ConditioningWeights): ConditioningFormat[] {
  return buildWeightedCycle(weights, FORMATS, 'intensive')
}

export function pickSessionFormat(weights: ConditioningWeights, planCount: number): ConditioningFormat {
  return buildFormatCycle(weights)[((planCount % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH]
}

/** Finisher kennt nur intensiv/rounds (Spec §0.1.4); Gleichstand → intensive. */
export function pickFinisherFormat(weights: ConditioningWeights): 'intensive' | 'rounds' {
  return weights.rounds > weights.intensive ? 'rounds' : 'intensive'
}
