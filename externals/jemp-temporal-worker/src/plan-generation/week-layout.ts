// Deterministic week-layout engine (spec §2.1, §2.9). Pure: no IO, no Date.
// Wired into the pipeline in Phase 2b behind the set_by_wizard gate.

/** Forward distance in days from `from` to `to` on the circular week (1=Mon..7=Sun). */
export function circularDayDistance(from: number, to: number): number {
  return ((to - from) % 7 + 7) % 7
}
