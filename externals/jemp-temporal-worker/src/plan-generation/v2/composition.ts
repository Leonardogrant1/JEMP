// Session-Composition-Rework (Spec 2026-10-09 §1). Pure, deterministisch:
// plant die Woche als Ganzes — ein Primary pro Session (Kraft-Rotation),
// Fokus-Blöcke nach Wochen-Budget, Core als Standard-Block.

import type { PillarLevels, PillarSlug, PlacedDay, PlannedWorkoutBlock } from '../week-layout'
import { COMPACT_SESSION_THRESHOLD_MINUTES, contentBlockCount } from '../week-layout-constants'

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

// Lead-Rotation (Spec 2026-10-10 §2): lower ↔ upper; die Kraftmuster leben
// als Pattern-Anforderungen IM Block, nicht mehr als eigene Block-Typen.
const STRENGTH_LEAD_ROTATION = ['lower_strength', 'upper_strength'] as const
// Pro Tag eine vertikale + eine horizontale Achse (wie das alte coarse-Pairing).
const upperAxes = (i: number): { push: string; pull: string } =>
  i % 2 === 0 ? { push: 'push_vertical', pull: 'pull_horizontal' } : { push: 'push_horizontal', pull: 'pull_vertical' }

/** §1.1–1.7: komponiert pro Trainingstag die Blockliste (inkl. warmup/cooldown). */
export function composeWeek(input: {
  trainingDays: PlacedDay[]
  pillarLevels: PillarLevels
  hasSpeedSession: boolean
}): Map<number, PlannedWorkoutBlock[]> {
  const days = [...input.trainingDays].sort((a, b) => a.day_of_week - b.day_of_week)
  const n = days.length
  if (n === 0) return new Map()

  // ── 1. Lead-Rotation (Spec 2026-10-10 §2.1): lower ↔ upper, der heavy_lower-
  // Tag des Placements bekommt den Lower-Lead per Slot-Tausch (eine Wahrheit
  // für den schweren Beintag, E2E-Befund Task 12 bleibt gültig).
  const leads: string[] = days.map((_, i) => STRENGTH_LEAD_ROTATION[i % 2])
  const heavyIdx = days.findIndex((d) => d.heavy_lower)
  if (heavyIdx !== -1 && leads[heavyIdx] !== 'lower_strength') {
    const lowerIdx = leads.indexOf('lower_strength')
    if (lowerIdx !== -1) { leads[lowerIdx] = leads[heavyIdx]; leads[heavyIdx] = 'lower_strength' }
  }

  // Alternierungs-Zähler PRO ROLLE (Review 10.10.): Lead und Begleit zählen
  // getrennt — sonst frisst der Begleitblock den Lead-Slot und ein Muster ist
  // 4 Wochen lang nie heavy. Biases bei nur einem Lead pro Region/Woche:
  // hinge-heavy (hintere Kette) und pull-heavy (Schulterbalance) zuerst (§1.2).
  let lowerLeadCount = 0
  const nextLowerLeadPattern = () => (lowerLeadCount++ % 2 === 0 ? 'hinge' : 'knee_dominant')
  let lowerCompanionCount = 0
  const nextLowerCompanionPattern = () => (lowerCompanionCount++ % 2 === 0 ? 'knee_dominant' : 'hinge')
  let upperLeadCount = 0

  const leadBlocks: PlannedWorkoutBlock[] = []
  const companionBlocks: PlannedWorkoutBlock[] = []
  days.forEach((day, i) => {
    const axes = upperAxes(i)
    const compact = day.minutes <= COMPACT_SESSION_THRESHOLD_MINUTES
    if (leads[i] === 'lower_strength') {
      leadBlocks.push({ block_type: 'lower_strength', variant: null, emphasis: 'heavy', patterns: [{ pattern: nextLowerLeadPattern(), emphasis: 'heavy' }] } as PlannedWorkoutBlock)
      companionBlocks.push({
        block_type: 'upper_strength', variant: null, emphasis: 'normal',
        // Begleit-Upper: Push+Pull als Antagonisten-Paar; Kompakt: nur Pull (§2.2)
        patterns: compact ? [{ pattern: axes.pull, emphasis: 'normal' }]
          : [{ pattern: axes.push, emphasis: 'normal' }, { pattern: axes.pull, emphasis: 'normal' }],
      } as PlannedWorkoutBlock)
    } else {
      const pullHeavy = upperLeadCount++ % 2 === 0 // §1.2: beginnt Pull-heavy
      leadBlocks.push({
        block_type: 'upper_strength', variant: null, emphasis: 'heavy',
        patterns: [
          { pattern: axes.push, emphasis: pullHeavy ? 'normal' : 'heavy' },
          { pattern: axes.pull, emphasis: pullHeavy ? 'heavy' : 'normal' },
        ],
      } as PlannedWorkoutBlock)
      companionBlocks.push({ block_type: 'lower_strength', variant: null, emphasis: 'normal', patterns: [{ pattern: nextLowerCompanionPattern(), emphasis: 'normal' }] } as PlannedWorkoutBlock)
    }
  })

  // ── 3. Core-Tage: 2–3× pro Woche, Ebene rotiert (§1.5/§1.7) ──────────────
  // transverse zuerst (die am meisten vernachlässigte, sportrelevanteste Ebene),
  // dann sagittal, dritter Tag generisch (LLM wählt — fängt frontal mit ab).
  // Sport-spezifischer Mix bleibt Post-v1 (Spec §4); dünne Varianten-Pools
  // fallen in buildBlockPools auf den ungefilterten Core-Pool zurück.
  const CORE_VARIANT_ROTATION: (string | null)[] = ['transverse', 'sagittal', null]
  const coreCount = Math.min(n, 3)
  const coreVariantByDay = new Map<number, string | null>()
  days.slice(0, coreCount).forEach((d, i) => coreVariantByDay.set(d.day_of_week, CORE_VARIANT_ROTATION[i % 3]))
  const coreDays = new Set(coreVariantByDay.keys())

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
  const isLowerPrimary = (i: number) => leads[i] === 'lower_strength'
  // "Push-Primary" heißt jetzt: Upper-Lead mit heavy Push-Pattern (§2.3).
  const isPushPrimary = (i: number) => leads[i] === 'upper_strength'
    && (leadBlocks[i].patterns ?? []).some((p) => p.pattern.startsWith('push') && p.emphasis === 'heavy')
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
  // Min-1-Garantie, nicht Voll-Budget (Fix 10.10.): vorher räumte Upper bei
  // Level 3 ALLE Lower-Tage leer — gewollt war nur "Säule geht nie verloren".
  if ((budget.upper_body_plyometrics ?? 0) > 0 && plyoUpperAssigned.size === 0) {
    const dow = [...plyoLowerAssigned].reverse()[0]
    if (dow !== undefined) { plyoLowerAssigned.delete(dow); plyoUpperAssigned.add(dow) }
  }

  // ── 4b. Säulen-Lead (Spec §3.1, Review 10.10.): Plyo Level 3 führt max. 1
  // Session — auf dem Lead-Tag der EIGENEN Region (Contrast: die Region tauscht
  // heavy Kraft gegen heavy Explosiv), nie bei n=1. lower vor upper.
  // Verschiebt höchstens EINE Zuweisung, reduziert nie die Plyo-Menge.
  let plyoLeadDow: number | null = null
  if (n >= 2) {
    const leadPillar = (['lower_body_plyometrics', 'upper_body_plyometrics'] as PillarSlug[])
      .find((p) => (input.pillarLevels[p] ?? 0) === 3)
    if (leadPillar) {
      const ownLead = leadPillar === 'lower_body_plyometrics' ? 'lower_strength' : 'upper_strength'
      const assigned = leadPillar === 'lower_body_plyometrics' ? plyoLowerAssigned : plyoUpperAssigned
      const other = leadPillar === 'lower_body_plyometrics' ? plyoUpperAssigned : plyoLowerAssigned
      const candidates = days
        .map((d, i) => ({ d, i }))
        .filter(({ i }) => leads[i] === ownLead)
        // Tage, die den Plyo-Block der Säule ohnehin tragen, zuerst
        .sort((a, b) => (assigned.has(a.d.day_of_week) ? 0 : 1) - (assigned.has(b.d.day_of_week) ? 0 : 1) || a.d.day_of_week - b.d.day_of_week)
      const chosen = candidates[0]
      if (chosen && assigned.size > 0) {
        plyoLeadDow = chosen.d.day_of_week
        if (!assigned.has(plyoLeadDow)) {
          // Genau EINE Zuweisung umziehen (höchster dow zuerst — deterministisch),
          // Rest bleibt unangetastet (Review: kein Wipe).
          const moved = [...assigned].sort((a, b) => b - a)[0]
          assigned.delete(moved)
          assigned.add(plyoLeadDow)
          // max 1 Plyo-Block pro Session: belegt die ANDERE Säule den Lead-Tag,
          // zieht sie auf den freigewordenen Tag um.
          if (other.has(plyoLeadDow)) { other.delete(plyoLeadDow); other.add(moved) }
        }
        leadBlocks[chosen.i].emphasis = 'normal' // Kraft-Lead → Erhaltungsdosis
        leadBlocks[chosen.i].patterns = leadBlocks[chosen.i].patterns!.map((p) => ({ ...p, emphasis: 'normal' as const }))
      }
    }
  }

  // §1.6.1 Deckel (übersetzt, §2.3): Tag mit Upper-Plyo UND Push-heavy im
  // Upper-Lead → Push-Pattern auf 'normal' dämpfen; bleibt kein heavy Pattern,
  // sinkt auch die Block-Emphasis (die Session hat dann keinen Kraft-Lead-Peak).
  days.forEach((d, i) => {
    if (!plyoUpperAssigned.has(d.day_of_week) || !isPushPrimary(i)) return
    leadBlocks[i].patterns = leadBlocks[i].patterns!.map((p) =>
      p.pattern.startsWith('push') ? { ...p, emphasis: 'normal' as const } : p)
    if (!leadBlocks[i].patterns!.some((p) => p.emphasis === 'heavy')) leadBlocks[i].emphasis = 'normal'
  })

  // ── 5. Pro Tag: Slots nach Priorität füllen, in Workout-Reihenfolge ordnen ─
  const result = new Map<number, PlannedWorkoutBlock[]>()
  days.forEach((day, i) => {
    const slots = contentBlockCount(day.minutes)
    const dow = day.day_of_week
    // Kandidaten in Auswahl-Priorität (wichtigstes zuerst).
    const ordered: PlannedWorkoutBlock[] = []
    // Säulen-Lead-Tag: Plyo heavy (4–5 Sätze, volle Pausen), sonst light-Akzent.
    const plyoEmphasis: 'heavy' | 'light' = dow === plyoLeadDow ? 'heavy' : 'light'
    const plyo = plyoLowerAssigned.has(dow)
      ? { block_type: 'plyo', variant: 'lower', emphasis: plyoEmphasis }
      : plyoUpperAssigned.has(dow)
        ? { block_type: 'plyo', variant: 'upper', emphasis: plyoEmphasis }
        : null
    const core = coreDays.has(dow)
      ? { block_type: 'core', variant: coreVariantByDay.get(dow) ?? null, emphasis: 'normal' as const }
      : null

    // Slot-Priorität (§2.2): Lead > Fokus (Plyo) > Begleit-Kraft > Core > Füller.
    // Der Begleitblock weicht den Fokus-Blöcken ZUERST — der Lead fällt nie.
    const picks: PlannedWorkoutBlock[] = [leadBlocks[i]]
    if (plyo) picks.push(plyo as PlannedWorkoutBlock)
    picks.push(companionBlocks[i])
    if (core) picks.push(core as PlannedWorkoutBlock)
    picks.push({ block_type: 'accessory', variant: null, emphasis: 'light' } as PlannedWorkoutBlock)
    picks.push({ block_type: 'optional', variant: null, emphasis: 'light' } as PlannedWorkoutBlock)
    const selected = picks.slice(0, slots)

    // Workout-Reihenfolge: plyo (PAP vor dem Heben), Lead, Begleit, core, Füller.
    const inSelected = (bt: string) => selected.filter((b) => b.block_type === bt)
    ordered.push(...inSelected('plyo'))
    ordered.push(...selected.filter((b) => b === leadBlocks[i]))
    ordered.push(...selected.filter((b) => b === companionBlocks[i]))
    ordered.push(...inSelected('core'))
    ordered.push(...inSelected('accessory'))
    ordered.push(...inSelected('optional'))

    result.set(dow, [
      { block_type: 'warmup', variant: null, emphasis: 'normal' } as PlannedWorkoutBlock,
      ...ordered,
      { block_type: 'cooldown', variant: null, emphasis: 'normal' } as PlannedWorkoutBlock,
    ])
  })
  return result
}
