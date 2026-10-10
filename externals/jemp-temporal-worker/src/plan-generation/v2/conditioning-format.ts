// Conditioning-Format-Logik (Spec 2026-10-10 §3): Gewichte → 10-Slot-Zyklus →
// deterministische Rotation über planCount. Pure, kein IO.

export type ConditioningFormat = 'extensive' | 'intensive' | 'rounds'
export type ConditioningWeights = Record<ConditioningFormat, number>

const FORMATS: ConditioningFormat[] = ['extensive', 'intensive', 'rounds']
const CYCLE_LENGTH = 10

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

/** Largest Remainder auf 10 Slots (Gleichstand: kleineres Gewicht gewinnt, damit
 *  5 %-Gewichte nicht systematisch auf 0 fallen), dann Verschränkung über
 *  Positions-Schlüssel (k + 0.5) / n (Gleichstand: kleineres n zuerst) —
 *  so landen Ein-Slot-Formate in der Zyklus-Mitte statt am Ende. */
export function buildFormatCycle(weights: ConditioningWeights): ConditioningFormat[] {
  const total = FORMATS.reduce((s, f) => s + weights[f], 0)
  if (total <= 0) return Array(CYCLE_LENGTH).fill('intensive')

  const quota = FORMATS.map((f) => ({ f, exact: (weights[f] / total) * CYCLE_LENGTH }))
  const slots = new Map(quota.map((q) => [q.f, Math.floor(q.exact)]))
  let remaining = CYCLE_LENGTH - [...slots.values()].reduce((a, b) => a + b, 0)
  const byRemainder = [...quota]
    .filter((q) => weights[q.f] > 0)
    .sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)) || weights[a.f] - weights[b.f])
  for (const q of byRemainder) {
    if (remaining <= 0) break
    slots.set(q.f, (slots.get(q.f) ?? 0) + 1)
    remaining--
  }

  const keyed: Array<{ f: ConditioningFormat; key: number; n: number }> = []
  for (const f of FORMATS) {
    const n = slots.get(f) ?? 0
    for (let k = 0; k < n; k++) keyed.push({ f, key: (k + 0.5) / n, n })
  }
  keyed.sort((a, b) => a.key - b.key || a.n - b.n || a.f.localeCompare(b.f))
  return keyed.map((e) => e.f)
}

export function pickSessionFormat(weights: ConditioningWeights, planCount: number): ConditioningFormat {
  return buildFormatCycle(weights)[((planCount % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH]
}

/** Finisher kennt nur intensiv/rounds (Spec §0.1.4); Gleichstand → intensive. */
export function pickFinisherFormat(weights: ConditioningWeights): 'intensive' | 'rounds' {
  return weights.rounds > weights.intensive ? 'rounds' : 'intensive'
}
