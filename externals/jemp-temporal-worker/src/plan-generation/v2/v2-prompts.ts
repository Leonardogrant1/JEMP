// v2 training-session prompt: the block structure is FIXED by the week-layout
// engine — the LLM only chooses exercises and prescriptions within each block.

import type { FinalWorkout, PlacedDay, PlannedWorkoutBlock } from '../week-layout'

const VARIANT_LABELS: Record<string, string> = {
  push_vertical: 'vertikaler Push (Overhead-Familie)',
  push_horizontal: 'horizontaler Push (Bank-/Liegestütz-Familie)',
  pull_vertical: 'vertikaler Pull (Klimmzug-Familie)',
  pull_horizontal: 'horizontaler Pull (Ruder-Familie)',
  knee_dominant: 'knie-dominant (Squat-Familie)',
  hinge: 'hüft-dominant (Hinge-Familie)',
  maximal: 'maximal (weit/hoch, volle Erholung)',
  submaximal: 'submaximal (rhythmisch, federnd)',
  stability: 'Stabilität (Anti-Bewegung)',
  power: 'Power (explosiv)',
}

export function V2_SESSION_PROMPT(input: {
  workout: FinalWorkout
  day: PlacedDay
  poolLines: string[]
  sprintPoolLine: string | null
  userContext: string
  weekSummary: string
  previousSummaries: string[]
}): string {
  const { workout, day, poolLines, sprintPoolLine, userContext, weekSummary, previousSummaries } = input

  const blockLines = workout.blocks.map((b: PlannedWorkoutBlock) => {
    const variant = b.variant ? ` — Variante: ${VARIANT_LABELS[b.variant] ?? b.variant}` : ''
    const emphasis = b.emphasis === 'heavy'
      ? ' — SCHWERPUNKT: höchste Übungsqualität, 3–5 Wiederholungen, lange Pausen'
      : b.emphasis === 'light' ? ' — leicht: Technik/Volumen, submaximal' : ''
    return `- \`${b.block_type}\`${variant}${emphasis}`
  }).join('\n')

  const microDose = !day.suppress_micro_dose
    ? '\n- Das Warmup MUSS eine CNS-Mikro-Dosis enthalten (schnelle Ministeps / 1–2 kurze Antritte aus dem Warmup-Pool).'
    : '\n- KEINE CNS-/Sprint-Inhalte im Warmup (gestern war Speed-Tag — Redundanz vermeiden).'

  const sprintBlock = day.carries_sprint_block && sprintPoolLine
    ? `\n- Diese Session trägt den integrierten Sprint-Block: Füge direkt nach dem Warmup einen \`sprint\`-Block ein (10–15 min, 3–5 Antritte, volle Pausen). Pool: ${sprintPoolLine}`
    : ''

  return `Du bist ein professioneller Athletiktrainer. Die BLOCK-STRUKTUR dieser Session ist fest vorgegeben — wähle NUR die Übungen und Verschreibungen pro Block.

## Nutzerdaten
${userContext}

## Wochenplan
${weekSummary}

## Diese Session (Tag ${day.day_of_week}, ${day.minutes} min, Dosis: ${day.dose})
Blöcke in GENAU dieser Reihenfolge — jeder Block MUSS vorkommen, keine zusätzlichen Blöcke:
${blockLines}
${microDose}${sprintBlock}

## Übungspools pro Block (NUR daraus wählen)
${poolLines.join('\n')}

## Regeln
- 1–2 Übungen pro Block (SCHWERPUNKT-Block: 1 Hauptübung + optional 1 Ergänzung).
- Dosis "maintenance": Sätze reduzieren (2 statt 3–4), submaximal — Spielwoche.
- Keine Übung doppelt in der Session.
- Vorherige Sessions dieser Woche (für Abwechslung):
${previousSummaries.length > 0 ? previousSummaries.map((s) => `  - ${s}`).join('\n') : '  - (erste Session der Woche)'}
- session_type ist "training", day_of_week ist ${day.day_of_week}.`
}
