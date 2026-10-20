// v2 training-session step: LLM fills a FIXED block structure from per-block
// pools; a pure validator + retry loop guarantees the structure survives.

import { z } from 'zod'
import { AMRAP_BLOCK_TYPES, STRENGTH_BLOCK_TYPES } from './pool'
import { zodResponseFormat } from 'openai/helpers/zod'
import type OpenAI from 'openai'
import type { FinalWorkout, PlacedDay } from '../week-layout'
import { COMPACT_SESSION_THRESHOLD_MINUTES } from '../week-layout-constants'
import type { PlannedSessionLike } from './build-speed-session'
import { buildConditioningFinisherBlock } from './build-simple-sessions'
import { trainingSessionTitle } from './session-title'
import { V2_SESSION_PROMPT } from './v2-prompts'

function toEnum(values: string[]): z.ZodTypeAny {
  const unique = [...new Set(values)].filter(Boolean)
  if (unique.length === 0) return z.string()
  return z.enum(unique as [string, ...string[]])
}

export function buildV2SessionSchema(blockTypes: string[], exerciseSlugs: string[]) {
  const dynExercise = z.object({
    exercise_slug: toEnum(exerciseSlugs),
    order_index: z.number(),
    notes: z.string(),
    target_sets: z.number(),
    target_reps_min: z.number(),
    target_reps_max: z.number(),
    target_duration_seconds: z.number(),
    target_distance_meters: z.number(),
    target_rest_seconds: z.number(),
    target_load_type: z.enum(['bodyweight', 'kg', 'rpe', 'pace']),
    target_load_value: z.number(),
  })
  return z.object({
    name: z.string(),
    mode_slug: z.enum(['full', 'reduced', 'activation', 'recovery']),
    estimated_duration_minutes: z.number(),
    day_of_week: z.number(),
    order_index: z.number(),
    session_type: z.literal('training'),
    description: z.string(),
    pause_between_sets: z.number(),
    blocks: z.array(z.object({
      block_type: toEnum(blockTypes),
      order_index: z.number(),
      focused_category_slug: z.string(),
      exercises: z.array(dynExercise),
    })).min(blockTypes.length),
  })
}

/** Pattern-Anforderung eines Kraftblocks (Spec 2026-10-10 §1.2) in Validator-
 *  Sicht; über die Activity-Grenze reisen die slugs als string[] (V2SessionContext). */
export type PatternRequirement = {
  block_type: string; pattern: string; emphasis: 'heavy' | 'normal'; slugs: Set<string>
  planeFocus?: 'frontal' | 'transverse'; planeSlugs?: string[]
}

/** LLM-Dosierungsfelder, soweit der Validator sie prüft (Dosierungs-Härtung
 *  QA 11.10.): Prompt-Anweisungen allein ließen Lasten (@0 kg) und ganze
 *  Dosierungen (lateral_shuffle 5×nichts) regelmäßig weg. */
type DosedExercise = {
  exercise_slug: string
  target_reps_max?: number
  target_duration_seconds?: number
  target_distance_meters?: number
  target_load_type?: string
  target_load_value?: number
}

export function findV2Violations(
  session: { blocks: Array<{ block_type: string; exercises: DosedExercise[] }> },
  pools: Map<string, { slugs: Set<string> }>,
  expectedBlocks: string[],
  patternReqs: PatternRequirement[] = [],
  checks: {
    warmupCnsSlugs?: string[]
    measurementBySlug?: Record<string, string>
    /** Rahmen-Mindestumfang (QA 11.10., v1-Parität): Floor unterhalb der
     *  Prompt-Vorgabe (4–6 bzw. 3–5), damit der Retry nicht ständig feuert. */
    minWarmup?: number
    minCooldown?: number
  } = {},
): string[] {
  const violations: string[] = []
  const seen = session.blocks.map((b) => b.block_type)

  for (const expected of expectedBlocks) {
    const count = seen.filter((bt) => bt === expected).length
    if (count === 0) violations.push(`Block "${expected}" fehlt`)
    if (count > 1) violations.push(`Block "${expected}" kommt ${count}× vor (erlaubt: genau 1×)`)
  }
  for (const b of session.blocks) {
    if (!expectedBlocks.includes(b.block_type)) {
      violations.push(`Unerwarteter Block "${b.block_type}"`)
      continue
    }
    if (b.exercises.length === 0) violations.push(`Block "${b.block_type}" ist leer (empty)`)
    const pool = pools.get(b.block_type)
    for (const e of b.exercises) {
      if (pool && !pool.slugs.has(e.exercise_slug)) {
        violations.push(`"${e.exercise_slug}" ist nicht im Pool von Block "${b.block_type}"`)
      }
      // Dosierungs-Härtung (QA 11.10.): jede Übung braucht eine echte Dosis —
      // Platzhalter (0/-1) zählen nicht.
      const dosed = (e.target_reps_max ?? 0) > 0 || (e.target_duration_seconds ?? 0) > 0 || (e.target_distance_meters ?? 0) > 0
      if (!dosed) {
        violations.push(`"${e.exercise_slug}" in Block "${b.block_type}" hat keine Dosierung — setze target_reps_min/max ODER target_duration_seconds ODER target_distance_meters`)
      }
      if (e.target_load_type === 'kg' && !((e.target_load_value ?? 0) > 0)) {
        violations.push(`"${e.exercise_slug}" in Block "${b.block_type}": target_load_type "kg" braucht target_load_value > 0 — setze eine realistische Last oder nutze rpe/bodyweight`)
      }
      // Mess-Typ (QA 11.10.): der Katalog kennt die richtige Einheit — ein
      // Stretch als "1×1 Rep" oder ein A-Skip als "2 Reps" ist ein Mess-Typ-
      // Fehler, keine Geschmacksfrage. reps_or_duration bleibt frei.
      const m = checks.measurementBySlug?.[e.exercise_slug]
      if (m === 'duration' && !((e.target_duration_seconds ?? 0) > 0)) {
        violations.push(`"${e.exercise_slug}" in Block "${b.block_type}" ist eine Dauer-Übung — setze target_duration_seconds (Sekunden), nicht Wiederholungen`)
      } else if (m === 'distance' && !((e.target_distance_meters ?? 0) > 0)) {
        violations.push(`"${e.exercise_slug}" in Block "${b.block_type}" ist eine Distanz-Übung — setze target_distance_meters (Meter)`)
      } else if (m === 'reps' && !((e.target_reps_max ?? 0) > 0)) {
        violations.push(`"${e.exercise_slug}" in Block "${b.block_type}" ist eine Wiederholungs-Übung — setze target_reps_min/max`)
      }
    }
  }
  // Block-Obergrenze (QA 11.10., programmatisch): Content-Blöcke tragen
  // geforderte Muster + 1 Ergänzung, sonst 2 — gegen Zeitbudget-Überläufe.
  // Rahmen (warmup/cooldown) hat eigene Min-Regeln, Sprint/Conditioning sind
  // deterministisch gebaut bzw. eigenständig dosiert.
  const MAX_EXEMPT = new Set(['warmup', 'cooldown', 'sprint', 'conditioning'])
  for (const b of session.blocks) {
    if (MAX_EXEMPT.has(b.block_type)) continue
    const patternCount = patternReqs.filter((r) => r.block_type === b.block_type).length
    const maxExercises = Math.max(2, patternCount + 1)
    if (b.exercises.length > maxExercises) {
      violations.push(`Block "${b.block_type}" hat ${b.exercises.length} Übungen — höchstens ${maxExercises} verschreiben`)
    }
  }
  // Rahmen-Mindestumfang (QA 11.10.): 2 Übungen Warmup vor schwerem Pressen
  // sind zu dünn — v1 gab 4 (full) vor, hier der Validator-Floor darunter.
  for (const [bt, min] of [['warmup', checks.minWarmup], ['cooldown', checks.minCooldown]] as const) {
    if (!min) continue
    const blk = session.blocks.find((b) => b.block_type === bt)
    if (blk && blk.exercises.length > 0 && blk.exercises.length < min) {
      violations.push(`${bt === 'warmup' ? 'Warmup' : 'Cooldown'} hat nur ${blk.exercises.length} Übung(en) — mindestens ${min} verschreiben`)
    }
  }
  // CNS-Mikro-Dosis (QA 11.10.): der Prompt fordert sie, das LLM vergaß sie in
  // 3/3 Sessions — leere Kandidatenliste (Datenloch oder Speed-Vortag) → kein Check.
  const cns = checks.warmupCnsSlugs ?? []
  if (cns.length > 0) {
    const warmup = session.blocks.find((b) => b.block_type === 'warmup')
    if (warmup && !warmup.exercises.some((e) => cns.includes(e.exercise_slug))) {
      violations.push(`Warmup ohne CNS-Mikro-Dosis — füge 1 Übung hinzu aus: ${cns.slice(0, 8).join(', ')}`)
    }
  }
  // Spec 2026-10-10 §1.2: jedes geforderte Kraftmuster ist mit ≥1 Übung aus
  // seinem Pattern-Pool vertreten (fehlende Blöcke werden oben schon gemeldet).
  for (const req of patternReqs) {
    const b = session.blocks.find((x) => x.block_type === req.block_type)
    if (!b) continue
    if (!b.exercises.some((e) => req.slugs.has(e.exercise_slug))) {
      violations.push(`Block "${req.block_type}": kein ${req.pattern} vertreten — wähle 1 Übung aus: ${[...req.slugs].slice(0, 12).join(', ')}`)
    }
  }
  return violations
}

/** Mess-Typ-Marker für Pool-Zeilen (QA 11.10.): (s) = Sekunden, (m) = Meter —
 *  damit das LLM die Einheit nicht aus dem Slug-Namen raten muss. */
export function withMeasurementMarkers(slugs: string[], measurementBySlug: Record<string, string>): string {
  return slugs.map((s) => {
    const m = measurementBySlug[s]
    return m === 'duration' ? `${s} (s)` : m === 'distance' ? `${s} (m)` : s
  }).join(', ')
}

/** EBENEN-FOKUS-Zeilen (Spec 2026-10-11 §4.3): explizite Ansage gegen den
 *  Lehrbuch-Bias — Fenster-Verknappung allein reicht nicht, das LLM greift
 *  sonst zur erstbesten Hantelübung. */
export function buildPlaneFocusLines(
  reqs: Array<{ pattern: string; planeFocus?: 'frontal' | 'transverse'; planeSlugs?: string[] }>,
): string[] {
  return reqs
    .filter((r) => r.planeFocus && (r.planeSlugs ?? []).length > 0)
    .map((r) => `EBENEN-FOKUS: Wähle für ${r.pattern} heute eine dieser Übungen als Sekundärmuster-Übung — ${r.planeFocus === 'frontal' ? 'laterale' : 'rotierende'} Kraft gehört zum Sport des Athleten: ${r.planeSlugs!.join(', ')}`)
}

/** v2 per-session payload — crosses the Temporal workflow/activity boundary,
 *  so it must stay plain JSON (no Maps, no class instances). */
export type V2SessionContext = {
  workout: FinalWorkout
  day: PlacedDay
  /** block_type -> pool slugs */
  pools: Record<string, string[]>
  sprintPool: string[]
  /** Pool for the deterministic conditioning finisher (appended in code, not by the LLM). */
  conditioningFinisherPool: string[]
  /** Finisher-Format nach Sportgewichtung (Spec 2026-10-10 §3.4) — default intensive. */
  conditioningFinisherFormat?: 'intensive' | 'rounds'
  /** Rotations-Offset (= planCount) gegen die alphabetische Übungs-Monotonie. */
  conditioningFinisherOffset?: number
  /** Pattern-Anforderungen der Kraftblöcke (Spec 2026-10-10 §1.2) — slugs als
   *  string[] wegen der Temporal-Payload-Serialisierung. planeFocus/planeSlugs
   *  (Spec 2026-10-11 §4.3): Ebenen-Betonung des Musters für die Prompt-Ansage. */
  patternReqs?: Array<{ block_type: string; pattern: string; emphasis: 'heavy' | 'normal'; slugs: string[];
    planeFocus?: 'frontal' | 'transverse'; planeSlugs?: string[] }>
  /** Sport-Präferenzen (QA 10.10.): Übungen aus exercise_sport_groups für die
   *  Gruppe des Users — werden im Prompt explizit als bevorzugt genannt. */
  preferredSlugs?: string[]
  /** CNS-Mikro-Dosis-Kandidaten im Warmup-Pool dieses Tages (Dosierungs-
   *  Härtung 11.10.) — leer/fehlend = kein Validator-Check. */
  warmupCnsPool?: string[]
  /** Mess-Typ je wählbarem Slug (QA 11.10.): reps|duration|distance|
   *  reps_or_duration — treibt Prompt-Marker und Validator-Check. */
  measurementBySlug?: Record<string, string>
}

/**
 * Überträgt die Emphasis der Komposition (heavy/normal/light) auf die vom LLM
 * gelieferten Blöcke — das LLM-Schema kennt keine Emphasis, die App braucht sie
 * aber persistiert (z. B. "harter Beintag"-Warnung beim Sprint-Verschieben).
 * Doppelte block_types werden in Auftretensreihenfolge zugeordnet; Blöcke ohne
 * geplantes Gegenstück (sprint, conditioning-Finisher) bleiben unberührt.
 */
export function attachBlockEmphasis(
  blocks: Array<{ block_type: string; emphasis?: string }>,
  planned: Array<{ block_type: string; emphasis?: string }>,
): void {
  const queues = new Map<string, (string | undefined)[]>()
  for (const p of planned) {
    const q = queues.get(p.block_type) ?? []
    q.push(p.emphasis)
    queues.set(p.block_type, q)
  }
  for (const b of blocks) {
    const q = queues.get(b.block_type)
    if (!q || q.length === 0) continue
    const emphasis = q.shift()
    if (emphasis) b.emphasis = emphasis
  }
}

/** Warmup/Cooldown ohne Satzpausen (QA 14.10.): Mobility-Drills ohne Last
 * brauchen keine Pause — das LLM vergab trotzdem 15s, darum deterministisch
 * genullt statt per Prompt erbeten. Distanz-Übungen (Lauf-ABC, Steigerungs-
 * läufe) behalten ihre Pause: der Rückweg IST die Pause. */
export function zeroWarmupCooldownRest(
  blocks: Array<{ block_type: string; exercises: Array<{ target_rest_seconds: number; target_distance_meters?: number | null }> }>,
): void {
  for (const b of blocks) {
    if (b.block_type !== 'warmup' && b.block_type !== 'cooldown') continue
    for (const e of b.exercises ?? []) {
      if ((e.target_distance_meters ?? 0) > 0) continue
      e.target_rest_seconds = 0
    }
  }
}

/** Last-Härtung (QA 18.10.): der Retry-Fallback übernimmt nach MAX_ATTEMPTS
 * die letzte Session trotz offener Validator-Violations — "0 kg" und
 * "pace 0" (an A-Skips und sogar box_breathing) erreichten so die App.
 * Deterministische Reparatur statt Prompt-Hoffnung:
 *   kg/percent_1rm <= 0 -> Kraftblöcke RPE 7, Warmup/Cooldown bodyweight,
 *   Rest RPE 6; pace <= 0 -> bodyweight (Null-Pace ist überall sinnlos);
 *   rpe <= 0 -> Block-Default (7 Kraft, 6 sonst). */
export function fixInvalidLoads(
  blocks: Array<{ block_type: string; exercises: Array<{ target_load_type: string; target_load_value: number }> }>,
): void {
  for (const b of blocks) {
    const defaultRpe = STRENGTH_BLOCK_TYPES.has(b.block_type) ? 7 : 6
    for (const e of b.exercises ?? []) {
      if (e.target_load_value > 0) continue
      switch (e.target_load_type) {
        case 'pace':
          e.target_load_type = 'bodyweight'
          e.target_load_value = -1
          break
        case 'kg':
        case 'percent_1rm':
          if (b.block_type === 'warmup' || b.block_type === 'cooldown') {
            e.target_load_type = 'bodyweight'
            e.target_load_value = -1
          } else {
            e.target_load_type = 'rpe'
            e.target_load_value = defaultRpe
          }
          break
        case 'rpe':
          e.target_load_value = defaultRpe
          break
      }
    }
  }
}

/** AMRAP (QA 20.10.): Bodyweight-Reps-Arbeit in Kraft- und Core-Blöcken hat
 *  keinen Intensitätsregler — jede feste Range (ab_wheel_rollout „6–8") ist
 *  willkürlich, also gehen alle Sätze bis kurz vors Versagen und die App
 *  zeigt „Max". Die Regel existierte im alten Phase-C-Pfad (generate-plan.ts,
 *  nur primary/secondary) und ging beim v2-Umbau verloren. Läuft NACH
 *  fixInvalidLoads (setzt bodyweight) und enforceMeasurementTypes (nullt
 *  Reps bei Duration-Typen). */
export function flagAmrapExercises(
  blocks: Array<{ block_type: string; exercises: Array<{ target_load_type: string; target_reps_min: number; target_reps_max: number }> }>,
): void {
  for (const b of blocks) {
    if (!AMRAP_BLOCK_TYPES.has(b.block_type)) continue
    for (const e of b.exercises ?? []) {
      if (e.target_load_type !== 'bodyweight') continue
      if (!(e.target_reps_min > 0 || e.target_reps_max > 0)) continue
      ;(e as any).is_amrap = true
    }
  }
}

/** Swap-Grundlage (Spec 2026-10-19): schreibt pro Kraft-Übung das erfüllte
 *  Pattern + dessen Emphasis aus den patternReqs an die Übung — save-plan
 *  persistiert beides, der Swap-Endpoint filtert damit ohne zu raten.
 *  Übungen ohne Req-Treffer (z. B. Datenloch) bleiben unannotiert → null.
 *  Zwei-Pass-Zuordnung (Review 20.10.): ungetaggte Übungen stehen via
 *  Coarse-Fallback in den Fenstern BEIDER Geschwister-Patterns (push_vertical
 *  UND push_horizontal) — first-match vergab dann z. T. das falsche Label und
 *  der Swap bot Vertikal-Alternativen für einen Horizontal-Slot an. Jetzt:
 *  erst eindeutige Übungen, dann Mehrdeutige bevorzugt auf noch unbedeckte
 *  Patterns. */
export function attachPatternAssignment(
  blocks: Array<{ block_type: string; exercises: Array<{ exercise_slug: string }> }>,
  patternReqs: PatternRequirement[],
): void {
  for (const b of blocks) {
    const reqs = patternReqs.filter((r) => r.block_type === b.block_type)
    if (reqs.length === 0) continue
    const covered = new Set<string>()
    const assign = (e: { exercise_slug: string }, req: PatternRequirement) => {
      ;(e as any).assigned_pattern = req.pattern
      ;(e as any).pattern_emphasis = req.emphasis
      covered.add(req.pattern)
    }
    const ambiguous: Array<{ e: { exercise_slug: string }; matches: PatternRequirement[] }> = []
    for (const e of b.exercises ?? []) {
      const matches = reqs.filter((r) => r.slugs.has(e.exercise_slug))
      if (matches.length === 1) assign(e, matches[0])
      else if (matches.length > 1) ambiguous.push({ e, matches })
    }
    for (const { e, matches } of ambiguous) {
      assign(e, matches.find((r) => !covered.has(r.pattern)) ?? matches[0])
    }
  }
}

/** Mess-Typ erzwingen statt nur prüfen (QA 19.10.): Der Validator verlangt
 *  bei Dauer-Übungen nur target_duration_seconds > 0 — das LLM setzte teils
 *  ZUSÄTZLICH Reps (high_knees "2×15–20"), und Anzeige/Print bevorzugen Reps.
 *  Deterministisch: Dauer-Übungen verlieren ihre Reps (fehlende Dauer → 15s
 *  Drill-Default, Parität zur Migration 20261014100000); Distanz-Übungen mit
 *  gesetzter Distanz ebenso. */
export function enforceMeasurementTypes(
  blocks: Array<{ exercises: Array<{ exercise_slug: string; target_reps_min: number; target_reps_max: number; target_duration_seconds: number; target_distance_meters?: number | null }> }>,
  measurementBySlug: Record<string, string> | undefined,
): void {
  if (!measurementBySlug) return
  for (const b of blocks) {
    for (const e of b.exercises ?? []) {
      const m = measurementBySlug[e.exercise_slug]
      if (m === 'duration') {
        if (!(e.target_duration_seconds > 0)) e.target_duration_seconds = 15
        e.target_reps_min = 0
        e.target_reps_max = 0
      } else if (m === 'distance' && (e.target_distance_meters ?? 0) > 0) {
        e.target_reps_min = 0
        e.target_reps_max = 0
      }
    }
  }
}

export async function runSessionV2(
  input: V2SessionContext & {
    userContext: string
    weekSummary: string
    previousSummaries: string[]
    orderIndex: number
  },
  openai: OpenAI,
): Promise<PlannedSessionLike> {
  const { workout, day, pools, sprintPool, userContext, weekSummary, previousSummaries, orderIndex } = input
  const patternReqs: PatternRequirement[] = (input.patternReqs ?? []).map((r) => ({ ...r, slugs: new Set(r.slugs) }))

  const expectedBlocks = workout.blocks.map((b) => b.block_type as string)
  if (day.carries_sprint_block && sprintPool.length > 0) {
    expectedBlocks.splice(expectedBlocks.indexOf('warmup') + 1, 0, 'sprint')
  }

  const poolMap = new Map<string, { slugs: Set<string> }>()
  const poolLines: string[] = []
  for (const bt of expectedBlocks) {
    const pool = bt === 'sprint' ? sprintPool : (pools[bt] ?? [])
    poolMap.set(bt, { slugs: new Set(pool) })
    // Kraftblöcke (Spec 2026-10-10): Pool nach Pattern gruppiert, damit das LLM
    // sieht, welche Übungen welche Anforderung erfüllen.
    const reqsForBlock = patternReqs.filter((r) => r.block_type === bt)
    const mm = input.measurementBySlug ?? {}
    if (reqsForBlock.length > 0) {
      poolLines.push(`- \`${bt}\`: ${reqsForBlock.map((r) => `${r.pattern}: [${withMeasurementMarkers([...r.slugs], mm)}]`).join(' | ')}`)
    } else {
      poolLines.push(`- \`${bt}\`: ${withMeasurementMarkers(pool, mm) || '(leer)'}`)
    }
  }
  const allSlugs = [...new Set(expectedBlocks.flatMap((bt) => [...poolMap.get(bt)!.slugs]))]
  const schema = buildV2SessionSchema(expectedBlocks, allSlugs)

  // Sport-Präferenz-Zeile (QA 10.10.): nur Übungen, die in dieser Session auch
  // wählbar sind — gegen den Lehrbuch-Bias braucht das LLM die explizite Ansage.
  const allSlugSet = new Set(allSlugs)
  const preferredInSession = (input.preferredSlugs ?? []).filter((s) => allSlugSet.has(s))
  const basePrompt = V2_SESSION_PROMPT({
    workout, day, poolLines,
    sprintPoolLine: day.carries_sprint_block ? sprintPool.join(', ') : null,
    preferredLine: preferredInSession.length > 0 ? preferredInSession.join(', ') : null,
    planeFocusLines: buildPlaneFocusLines(input.patternReqs ?? []),
    userContext, weekSummary, previousSummaries,
  })

  let feedback: string | undefined
  let lastSession: z.infer<typeof schema> | undefined
  const MAX_ATTEMPTS = 3

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const prompt = feedback
      ? `${basePrompt}\n\n## KORREKTUR (vorheriger Versuch ungültig)\n${feedback}\nBehebe alle genannten Verstöße und gib die vollständige Session zurück.`
      : basePrompt
    const completion = await openai.chat.completions.create({
      // QA 11.10.: mini auf low ignorierte weiche Prompt-Regeln (Einheiten,
      // Block-Größen) — medium ist der größte Adhärenz-Sprung pro Euro; die
      // harten Regeln sichert weiterhin der Validator.
      model: 'gpt-5-mini',
      messages: [{ role: 'user', content: prompt }],
      reasoning_effort: 'medium',
      response_format: zodResponseFormat(schema, 'data'),
      max_completion_tokens: 8000,
    })
    const choice = completion.choices[0]
    if (choice.finish_reason === 'length' || !choice.message.content) {
      feedback = 'Antwort abgeschnitten — kompakter antworten.'
      continue
    }
    lastSession = JSON.parse(choice.message.content)
    const compact = day.minutes <= COMPACT_SESSION_THRESHOLD_MINUTES
    const violations = findV2Violations(lastSession as any, poolMap, expectedBlocks, patternReqs, {
      warmupCnsSlugs: day.suppress_micro_dose ? [] : (input.warmupCnsPool ?? []),
      measurementBySlug: input.measurementBySlug,
      minWarmup: compact ? 2 : 3, minCooldown: 2,
    })
    if (violations.length === 0) break
    feedback = violations.map((v) => `- ${v}`).join('\n')
    console.warn(`runSessionV2 day ${day.day_of_week} attempt ${attempt}: ${violations.length} violations`)
  }
  if (!lastSession) throw new Error(`runSessionV2: no usable completion for day ${day.day_of_week}`)

  // Deterministic conditioning finisher (integrated carrier): appended in code
  // before the cooldown — its minutes were already budgeted by the layout engine.
  const blocks = [...(lastSession as any).blocks]
  attachBlockEmphasis(blocks, workout.blocks as any)
  zeroWarmupCooldownRest(blocks)
  fixInvalidLoads(blocks)
  attachPatternAssignment(blocks, patternReqs)
  enforceMeasurementTypes(blocks, input.measurementBySlug)
  flagAmrapExercises(blocks)
  if (day.carries_conditioning_finisher) {
    const cooldownIdx = blocks.findIndex((b: any) => b.block_type === 'cooldown')
    const insertAt = cooldownIdx === -1 ? blocks.length : cooldownIdx
    const finisher = buildConditioningFinisherBlock(
      input.conditioningFinisherPool, insertAt,
      input.conditioningFinisherFormat ?? 'intensive', input.conditioningFinisherOffset ?? 0)
    if (finisher) {
      blocks.splice(insertAt, 0, finisher)
      blocks.forEach((b: any, i: number) => { b.order_index = i })
    } else {
      console.warn(`runSessionV2 day ${day.day_of_week}: conditioning finisher pool too small — skipped`)
    }
  }

  return {
    ...(lastSession as any),
    // Name deterministisch überschreiben (QA 09.10.): der LLM-Name schleuste
    // Sportart und Tag-Nummer ein. Fokus-Titel (10.10.) aus den GEPLANTEN
    // Blöcken — nur die tragen patterns/variant, die Output-Blöcke nicht.
    name: trainingSessionTitle(workout.blocks as any, day),
    blocks,
    day_of_week: day.day_of_week,
    order_index: orderIndex,
    session_type: 'training',
    dropped_blocks: workout.dropped.length > 0 ? workout.dropped : undefined,
  }
}
