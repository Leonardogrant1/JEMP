// v2 training-session prompt: the block structure is FIXED by the week-layout
// engine — the LLM only chooses exercises and prescriptions within each block.

import type { FinalWorkout, PlacedDay, PlannedWorkoutBlock } from '../week-layout'
import { COMPACT_SESSION_THRESHOLD_MINUTES } from '../week-layout-constants'
import { sessionPrepRegions } from './pool'

const VARIANT_LABELS: Record<string, string> = {
  push_vertical: 'vertikaler Push (Overhead-Familie)',
  push_horizontal: 'horizontaler Push (Bank-/Liegestütz-Familie)',
  pull_vertical: 'vertikaler Pull (Klimmzug-Familie)',
  pull_horizontal: 'horizontaler Pull (Ruder-Familie)',
  knee_dominant: 'knie-dominant (Squat-Familie)',
  hinge: 'hüft-dominant (Hinge-Familie)',
  maximal: 'maximal (weit/hoch, volle Erholung)',
  submaximal: 'submaximal (rhythmisch, federnd)',
  lower: 'Unterkörper-Explosivität (Sprünge)',
  upper: 'Oberkörper-Explosivität (Würfe, Plyo-Push)',
  sagittal: 'sagittal (Anti-Extension/linear)',
  frontal: 'frontal (lateral/Anti-Lateral)',
  transverse: 'transversal (rotierend/Anti-Rotation)',
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

  // Volumen-Hierarchie (§1.3): heavy = Primary (die Session), normal = Sekundär, light = Ergänzung.
  const patternDose = (e: 'heavy' | 'normal') => e === 'heavy'
    ? 'SCHWERPUNKT — 4–5 Sätze, 3–5 Wiederholungen, schwer, lange Pausen, höchste Übungsqualität'
    : '3 Sätze, 5–8 Wiederholungen, solide, nicht ans Limit'
  const blockLines = workout.blocks.map((b: PlannedWorkoutBlock) => {
    // Kraftblöcke (Spec 2026-10-10 §1.2): pro gefordertem Pattern eine Dosis-Zeile.
    if (b.patterns && b.patterns.length > 0) {
      const parts = b.patterns.map((p) => `${VARIANT_LABELS[p.pattern] ?? p.pattern}: ${patternDose(p.emphasis)}`).join(' | ')
      const superset = b.block_type === 'upper_strength' && b.patterns.length > 1
        ? ' — als Antagonisten-Supersatz ausführen' : ''
      return `- \`${b.block_type}\` — ${parts}${superset}`
    }
    const variant = b.variant ? ` — Variante: ${VARIANT_LABELS[b.variant] ?? b.variant}` : ''
    const emphasis = b.emphasis === 'heavy'
      ? ' — PRIMARY (die Hauptübung der Session): 4–5 Sätze, 3–5 Wiederholungen, schwer, lange Pausen, höchste Übungsqualität'
      : b.emphasis === 'light'
        // Review-Fix #5: Plyo ist nie "submaximal in der Ausführung" — wenig
        // Volumen, aber jede Wiederholung explosiv (PAP vor dem Primary).
        ? (b.block_type === 'plyo'
          ? ' — 2–3 Sätze à 3–5 explosive Wiederholungen, volle Pausen — Qualität vor Volumen'
          : ' — Ergänzung: 2 Sätze, submaximal')
        : (b.block_type === 'warmup' || b.block_type === 'cooldown') ? ''
          : ' — Sekundär: 3 Sätze, solide, nicht ans Limit'
    return `- \`${b.block_type}\`${variant}${emphasis}`
  }).join('\n')

  // §1.6.1 Oberkörper-Deckel: Plyo-Push/Würfe + Drücken in derselben Session —
  // der Oberkörper erholt sich in-session langsamer als die Streckerkette.
  const hasUpperPlyo = workout.blocks.some((b) => b.block_type === 'plyo' && b.variant === 'upper')
  // Legacy: eigener push-Block; neu (§2.3): Push-heavy-Pattern im upper_strength.
  const hasPush = workout.blocks.some((b) => b.block_type === 'push'
    || (b.patterns ?? []).some((p) => p.pattern.startsWith('push') && p.emphasis === 'heavy'))
  const upperCap = hasUpperPlyo && hasPush
    ? '\n- OBERKÖRPER-DECKEL: Der plyo-Block (Oberkörper) max 3×3 Wiederholungen; die push-Übungen danach nicht über ~85 % Intensität (keine Maximalversuche).'
    : ''

  const microDose = !day.suppress_micro_dose
    ? '\n- Das Warmup MUSS eine CNS-Mikro-Dosis enthalten (schnelle Ministeps / 1–2 kurze Antritte aus dem Warmup-Pool).'
    : '\n- KEINE CNS-/Sprint-Inhalte im Warmup (gestern war Speed-Tag — Redundanz vermeiden).'

  const sprintBlock = day.carries_sprint_block && sprintPoolLine
    ? `\n- Diese Session trägt den integrierten Sprint-Block: Füge direkt nach dem Warmup einen \`sprint\`-Block ein (10–15 min, 3–5 Antritte, volle Pausen). Pool: ${sprintPoolLine}`
    : ''

  // Region-Targeting (09.10., v1-Parität): Warmup bereitet vor, Cooldown dehnt
  // aus, was heute trainiert wird — die Pools sind bereits darauf verengt.
  const prepRegions = [...sessionPrepRegions(workout.blocks)]
  const prepLine = prepRegions.length > 0
    ? `\n- Warmup & Cooldown GEZIELT: Das Warmup bereitet dynamisch die heute belasteten Regionen vor (${prepRegions.join(', ')}), das Cooldown dehnt genau diese ruhig aus — keine generischen Füller.`
    : ''

  // Kompakt-Modus (QA 09.10.): kurze Sessions — die Blockliste ist bereits
  // auf das Zeitbudget gekürzt, die Verschreibung muss mitziehen.
  const compact = day.minutes <= COMPACT_SESSION_THRESHOLD_MINUTES
    ? '\n- KOMPAKT-SESSION: 2 Sätze pro Übung (SCHWERPUNKT-Block: 3), Push/Pull als Supersatz verschreiben (notes), Pausen 60–90 s. Keine Zusatzübungen.'
    : ''

  return `Du bist ein professioneller Athletiktrainer. Die BLOCK-STRUKTUR dieser Session ist fest vorgegeben — wähle NUR die Übungen und Verschreibungen pro Block.

## Nutzerdaten
${userContext}

## Wochenplan
${weekSummary}

## Diese Session (Tag ${day.day_of_week}, ${day.minutes} min, Dosis: ${day.dose})
Blöcke in GENAU dieser Reihenfolge — jeder Block MUSS vorkommen, keine zusätzlichen Blöcke:
${blockLines}
${microDose}${sprintBlock}${compact}${upperCap}${prepLine}

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
