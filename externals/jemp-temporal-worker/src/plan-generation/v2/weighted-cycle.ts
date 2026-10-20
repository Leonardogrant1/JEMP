// Generischer Largest-Remainder-10-Slot-Zyklus (Spec 2026-10-11 §3.1) —
// extrahiert aus conditioning-format.ts, Verhalten identisch. Pure, kein IO.

export const CYCLE_LENGTH = 10

/** Largest Remainder auf 10 Slots (Gleichstand: kleineres Gewicht gewinnt, damit
 *  5 %-Gewichte nicht systematisch auf 0 fallen), dann Verschränkung über
 *  Positions-Schlüssel (k + 0.5) / n (Gleichstand: kleineres n zuerst) —
 *  so landen Ein-Slot-Kategorien in der Zyklus-Mitte statt am Ende. */
export function buildWeightedCycle<T extends string>(
  weights: Record<T, number>,
  order: T[],
  fallback: T,
): T[] {
  const total = order.reduce((s, f) => s + weights[f], 0)
  if (total <= 0) return Array(CYCLE_LENGTH).fill(fallback)

  const quota = order.map((f) => ({ f, exact: (weights[f] / total) * CYCLE_LENGTH }))
  const slots = new Map<T, number>(quota.map((q) => [q.f, Math.floor(q.exact)]))
  let remaining = CYCLE_LENGTH - [...slots.values()].reduce((a, b) => a + b, 0)
  const byRemainder = [...quota]
    .filter((q) => weights[q.f] > 0)
    .sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)) || weights[a.f] - weights[b.f])
  for (const q of byRemainder) {
    if (remaining <= 0) break
    slots.set(q.f, (slots.get(q.f) ?? 0) + 1)
    remaining--
  }

  const keyed: Array<{ f: T; key: number; n: number }> = []
  for (const f of order) {
    const n = slots.get(f) ?? 0
    for (let k = 0; k < n; k++) keyed.push({ f, key: (k + 0.5) / n, n })
  }
  keyed.sort((a, b) => a.key - b.key || a.n - b.n || a.f.localeCompare(b.f))
  return keyed.map((e) => e.f)
}
