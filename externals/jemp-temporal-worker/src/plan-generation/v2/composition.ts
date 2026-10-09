// Session-Composition-Rework (Spec 2026-10-09 §1). Pure, deterministisch:
// plant die Woche als Ganzes — ein Primary pro Session (Kraft-Rotation),
// Fokus-Blöcke nach Wochen-Budget, Core als Standard-Block.

import type { PillarLevels, PillarSlug, PlacedDay, PlannedWorkoutBlock } from '../week-layout'
import { PRIMARY_ROTATION, contentBlockCount } from '../week-layout-constants'

/** Fokus-Säulen, die Content-Blöcke INNERHALB einer Training-Session erzeugen.
 *  sprints/cod/mobility werden vom Week-Layout als eigene Session-Typen platziert.
 *  conditioning läuft über den bestehenden carries_conditioning_finisher-
 *  Mechanismus (placeWeek), nicht über composeWeek — daher hier nicht gelistet. */
const CONTENT_FOCUS_PILLARS: PillarSlug[] = ['lower_body_plyometrics', 'upper_body_plyometrics']
const PLYO_PILLARS: PillarSlug[] = ['lower_body_plyometrics', 'upper_body_plyometrics']

const sumValues = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0)

/** §1.4: Säulen-Level → Blöcke/Woche (linear 1/2/3), min 1 je gesetzter Säule,
 *  proportionaler Clamp auf freeSlots (niedrigste Level zuerst gekürzt),
 *  Plyo −1 bei vorhandener Speed-Session (ZNS-Schutz, min 1). */
export function focusBlockBudget(
  pillarLevels: PillarLevels,
  freeSlots: number,
  hasSpeedSession: boolean,
): Partial<Record<PillarSlug, number>> {
  const desired: Partial<Record<PillarSlug, number>> = {}
  for (const p of CONTENT_FOCUS_PILLARS) {
    const level = pillarLevels[p] ?? 0
    if (level <= 0) continue
    const want = PLYO_PILLARS.includes(p) && hasSpeedSession ? Math.max(1, level - 1) : level
    desired[p] = want
  }

  if (sumValues(desired) <= freeSlots) return desired

  // Clamp: Säulen nach Level absteigend (Schwerpunkt zuerst), Tiebreak feste Reihenfolge.
  const byLevel = (Object.keys(desired) as PillarSlug[]).sort((a, b) =>
    ((pillarLevels[b] ?? 0) - (pillarLevels[a] ?? 0)) ||
    (CONTENT_FOCUS_PILLARS.indexOf(a) - CONTENT_FOCUS_PILLARS.indexOf(b)))

  const result: Partial<Record<PillarSlug, number>> = {}
  let remaining = freeSlots
  // A: min-1 je Säule, höchste Level zuerst (bei Budget < Säulenzahl fallen niedrigste raus).
  for (const p of byLevel) {
    if (remaining <= 0) break
    result[p] = 1
    remaining -= 1
  }
  // B: Rest nach Level absteigend bis zum Wunsch auffüllen.
  for (const p of byLevel) {
    if (remaining <= 0) break
    const current = result[p]
    if (current == null) continue
    const canAdd = Math.min((desired[p] ?? 0) - current, remaining)
    if (canAdd > 0) { result[p] = current + canAdd; remaining -= canAdd }
  }
  return result
}

// Grundmuster (coarse) ↔ Block-Typ/Variante für Primary + Komplement.
type Coarse = 'squat' | 'hinge' | 'push' | 'pull'
const COARSE_ORDER: Coarse[] = ['squat', 'hinge', 'push', 'pull']
const coarseToBlock = (c: Coarse, axisToggle: boolean): { block_type: string; variant: string } => {
  switch (c) {
    case 'squat': return { block_type: 'lower_body', variant: 'knee_dominant' }
    case 'hinge': return { block_type: 'lower_body', variant: 'hinge' }
    case 'push': return { block_type: 'push', variant: axisToggle ? 'push_vertical' : 'push_horizontal' }
    case 'pull': return { block_type: 'pull', variant: axisToggle ? 'pull_horizontal' : 'pull_vertical' }
  }
}
const blockTypeOfCoarse = (c: Coarse) => (c === 'squat' || c === 'hinge') ? 'lower_body' : c

/** §1.1–1.7: komponiert pro Trainingstag die Blockliste (inkl. warmup/cooldown). */
export function composeWeek(input: {
  trainingDays: PlacedDay[]
  pillarLevels: PillarLevels
  hasSpeedSession: boolean
}): Map<number, PlannedWorkoutBlock[]> {
  const days = [...input.trainingDays].sort((a, b) => a.day_of_week - b.day_of_week)
  const n = days.length
  if (n === 0) return new Map()

  // ── 1. Primary-Rotation (lower/push/pull), heavy ──────────────────────────
  // Slot-Sequenz zuerst; der Lower-Primary wird auf den heavy_lower-Tag des
  // Placements ausgerichtet (der trägt die Spieltags-Schutzlogik) — zwei
  // Wahrheiten für "schwerer Beintag" darf es nicht geben (E2E-Befund Task 12).
  const slots = days.map((_, i) => PRIMARY_ROTATION[i % PRIMARY_ROTATION.length])
  const heavyIdx = days.findIndex((d) => d.heavy_lower)
  if (heavyIdx !== -1 && slots[heavyIdx] !== 'lower_body') {
    const lowerIdx = slots.indexOf('lower_body')
    if (lowerIdx !== -1) { slots[lowerIdx] = slots[heavyIdx]; slots[heavyIdx] = 'lower_body' }
  }

  const coverage: Record<Coarse, number> = { squat: 0, hinge: 0, push: 0, pull: 0 }
  let lowerCount = 0
  const primaryCoarse: Coarse[] = []
  const primaryBlocks = days.map((_, i) => {
    const slot = slots[i]
    let c: Coarse
    if (slot === 'lower_body') { c = lowerCount % 2 === 0 ? 'squat' : 'hinge'; lowerCount++ }
    else if (slot === 'push') c = 'push'
    else c = 'pull'
    primaryCoarse.push(c)
    coverage[c] += 1
    const b = coarseToBlock(c, i % 2 === 0)
    return { block_type: b.block_type, variant: b.variant, emphasis: 'heavy' as 'heavy' | 'normal' | 'light' }
  })

  // ── 2. Komplement-Kraftblock je Tag (coverage-greedy, ≠ Primary-Block-Typ) ─
  const complementBlocks = days.map((_, i) => {
    const primaryBt = blockTypeOfCoarse(primaryCoarse[i])
    const candidates = COARSE_ORDER.filter((c) => blockTypeOfCoarse(c) !== primaryBt)
    candidates.sort((a, b) => coverage[a] - coverage[b] || COARSE_ORDER.indexOf(a) - COARSE_ORDER.indexOf(b))
    const pick = candidates[0]
    coverage[pick] += 1
    const b = coarseToBlock(pick, i % 2 === 1)
    return { block_type: b.block_type, variant: b.variant, emphasis: 'normal' as const }
  })

  // ── 3. Core-Tage: 2–3× pro Woche ──────────────────────────────────────────
  const coreCount = Math.min(n, 3)
  const coreDays = new Set(days.slice(0, coreCount).map((d) => d.day_of_week))

  // ── 4. Fokus-Budget (§1.4) + Verteilung auf Tage ──────────────────────────
  const totalContentSlots = days.reduce((s, d) => s + contentBlockCount(d.minutes), 0)
  const reserved = n /* primaries */ + n /* komplemente */ + coreCount
  const freeSlots = Math.max(0, totalContentSlots - reserved)
  const budget = focusBlockBudget(input.pillarLevels, freeSlots, input.hasSpeedSession)

  // Fokus-Block-Instanzen verteilen (max 1 je Typ pro Tag), nach Tages-Präferenz
  // (§1.6.1): lower-Plyo bevorzugt auf Lower-Primary-Tage (Potenzierung),
  // upper-Plyo bevorzugt WEG von Push-Primary-Tagen (ZNS-Schutz Oberkörper).
  const plyoLowerAssigned = new Set<number>()
  const plyoUpperAssigned = new Set<number>()
  const isLowerPrimary = (i: number) => primaryCoarse[i] === 'squat' || primaryCoarse[i] === 'hinge'
  const isPushPrimary = (i: number) => primaryCoarse[i] === 'push'
  const idxByPreference = (prefer: (i: number) => boolean) =>
    days.map((_, i) => i).sort((a, b) => (prefer(a) ? 0 : 1) - (prefer(b) ? 0 : 1))
  const distribute = (count: number, target: Set<number>, order: number[]) => {
    let placed = 0
    for (const i of order) {
      if (placed >= count) break
      const dow = days[i].day_of_week
      if (!target.has(dow)) { target.add(dow); placed++ }
    }
  }
  distribute(budget.lower_body_plyometrics ?? 0, plyoLowerAssigned, idxByPreference(isLowerPrimary))
  // upper-Plyo: Tage ohne lower-Plyo (max 1 Plyo-Block/Session, E2E-Befund) und
  // ohne Push-Primary zuerst; Push-Tage als Fallback. Reicht es nicht, wird ein
  // lower-Tag zu upper umgewidmet — die geclampte upper-Säule geht nie verloren.
  const upperOrder = days.map((_, i) => i)
    .filter((i) => !plyoLowerAssigned.has(days[i].day_of_week))
    .sort((a, b) => (isPushPrimary(a) ? 1 : 0) - (isPushPrimary(b) ? 1 : 0))
  distribute(budget.upper_body_plyometrics ?? 0, plyoUpperAssigned, upperOrder)
  if (plyoUpperAssigned.size < (budget.upper_body_plyometrics ?? 0)) {
    for (const dow of [...plyoLowerAssigned].reverse()) {
      if (plyoUpperAssigned.size >= (budget.upper_body_plyometrics ?? 0)) break
      plyoLowerAssigned.delete(dow)
      plyoUpperAssigned.add(dow)
    }
  }

  // §1.6.1 Deckel: Tag mit upper-Plyo UND Push-Primary → Push-Primary auf 'normal'.
  days.forEach((d, i) => {
    if (plyoUpperAssigned.has(d.day_of_week) && isPushPrimary(i)) primaryBlocks[i].emphasis = 'normal'
  })

  // ── 5. Pro Tag: Slots nach Priorität füllen, in Workout-Reihenfolge ordnen ─
  const result = new Map<number, PlannedWorkoutBlock[]>()
  days.forEach((day, i) => {
    const slots = contentBlockCount(day.minutes)
    const dow = day.day_of_week
    // Kandidaten in Auswahl-Priorität (wichtigstes zuerst).
    const ordered: PlannedWorkoutBlock[] = []
    const plyo = plyoLowerAssigned.has(dow)
      ? { block_type: 'plyo', variant: 'lower', emphasis: 'light' as const }
      : plyoUpperAssigned.has(dow)
        ? { block_type: 'plyo', variant: 'upper', emphasis: 'light' as const }
        : null
    const core = coreDays.has(dow) ? { block_type: 'core', variant: null, emphasis: 'normal' as const } : null

    // Priorität: primary > komplement > plyo > core.
    // (conditioning-in-Training läuft über carries_conditioning_finisher, nicht hier.)
    const picks: PlannedWorkoutBlock[] = [primaryBlocks[i] as PlannedWorkoutBlock, complementBlocks[i] as PlannedWorkoutBlock]
    if (plyo) picks.push(plyo as PlannedWorkoutBlock)
    if (core) picks.push(core as PlannedWorkoutBlock)
    const selected = picks.slice(0, slots)

    // Workout-Reihenfolge: plyo (vor primary), primary, komplement, core.
    const inSelected = (bt: string) => selected.filter((b) => b.block_type === bt)
    ordered.push(...inSelected('plyo'))
    for (const bt of ['push', 'pull', 'lower_body']) ordered.push(...inSelected(bt))
    ordered.push(...inSelected('core'))

    result.set(dow, [
      { block_type: 'warmup', variant: null, emphasis: 'normal' } as PlannedWorkoutBlock,
      ...ordered,
      { block_type: 'cooldown', variant: null, emphasis: 'normal' } as PlannedWorkoutBlock,
    ])
  })
  return result
}
