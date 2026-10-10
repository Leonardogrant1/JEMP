// v2 training-session step: LLM fills a FIXED block structure from per-block
// pools; a pure validator + retry loop guarantees the structure survives.

import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'
import type OpenAI from 'openai'
import type { FinalWorkout, PlacedDay } from '../week-layout'
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
export type PatternRequirement = { block_type: string; pattern: string; emphasis: 'heavy' | 'normal'; slugs: Set<string> }

export function findV2Violations(
  session: { blocks: Array<{ block_type: string; exercises: Array<{ exercise_slug: string }> }> },
  pools: Map<string, { slugs: Set<string> }>,
  expectedBlocks: string[],
  patternReqs: PatternRequirement[] = [],
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
   *  string[] wegen der Temporal-Payload-Serialisierung. */
  patternReqs?: Array<{ block_type: string; pattern: string; emphasis: 'heavy' | 'normal'; slugs: string[] }>
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
    if (reqsForBlock.length > 0) {
      poolLines.push(`- \`${bt}\`: ${reqsForBlock.map((r) => `${r.pattern}: [${[...r.slugs].join(', ')}]`).join(' | ')}`)
    } else {
      poolLines.push(`- \`${bt}\`: ${pool.join(', ') || '(leer)'}`)
    }
  }
  const allSlugs = [...new Set(expectedBlocks.flatMap((bt) => [...poolMap.get(bt)!.slugs]))]
  const schema = buildV2SessionSchema(expectedBlocks, allSlugs)

  const basePrompt = V2_SESSION_PROMPT({
    workout, day, poolLines,
    sprintPoolLine: day.carries_sprint_block ? sprintPool.join(', ') : null,
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
      model: 'gpt-5-mini',
      messages: [{ role: 'user', content: prompt }],
      reasoning_effort: 'low',
      response_format: zodResponseFormat(schema, 'data'),
      max_completion_tokens: 8000,
    })
    const choice = completion.choices[0]
    if (choice.finish_reason === 'length' || !choice.message.content) {
      feedback = 'Antwort abgeschnitten — kompakter antworten.'
      continue
    }
    lastSession = JSON.parse(choice.message.content)
    const violations = findV2Violations(lastSession as any, poolMap, expectedBlocks, patternReqs)
    if (violations.length === 0) break
    feedback = violations.map((v) => `- ${v}`).join('\n')
    console.warn(`runSessionV2 day ${day.day_of_week} attempt ${attempt}: ${violations.length} violations`)
  }
  if (!lastSession) throw new Error(`runSessionV2: no usable completion for day ${day.day_of_week}`)

  // Deterministic conditioning finisher (integrated carrier): appended in code
  // before the cooldown — its minutes were already budgeted by the layout engine.
  const blocks = [...(lastSession as any).blocks]
  attachBlockEmphasis(blocks, workout.blocks as any)
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
    // Sportart und Tag-Nummer ein — der Titel nennt nur den Trainingsinhalt.
    name: trainingSessionTitle(blocks, day),
    blocks,
    day_of_week: day.day_of_week,
    order_index: orderIndex,
    session_type: 'training',
    dropped_blocks: workout.dropped.length > 0 ? workout.dropped : undefined,
  }
}
