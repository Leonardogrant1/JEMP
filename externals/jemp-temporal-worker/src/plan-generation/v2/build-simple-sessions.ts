// Deterministic mobility + conditioning session builders (spec §2.6, §1.4).
// Pure — picks by ascending intensity then slug; formats are the prescription.

import type { PlacedDay } from '../week-layout'
import { legacyBlockAllows, type V2Exercise } from './pool'
import type { PlannedSessionLike } from './build-speed-session'
import type { ConditioningFormat } from './conditioning-format'

const byIntensityThenSlug = (a: V2Exercise, b: V2Exercise) =>
  (a.intensity_score ?? 5) - (b.intensity_score ?? 5) || a.slug.localeCompare(b.slug)

// Conditioning trainiert Intensität über Zeit bei sicherer Technik — nicht
// maximale Last (QA 10.10.). Maximal-Plyo gehört in den Plyo-Block (wenige
// Qualitäts-Wdh, volle Pause), nie ins Intervall; der Intensitäts-Cap hält
// auch submaximale Grenzfälle (z. B. reaktive Single-Leg-Jumps) draußen.
const CONDITIONING_MAX_INTENSITY = 7
const isConditioningExercise = (e: V2Exercise) =>
  (e.category_slug === 'lower_body_plyometrics' || e.category_slug === 'conditioning') &&
  e.sprint_type === null &&
  e.plyo_type !== 'maximal' &&
  (e.intensity_score ?? 5) <= CONDITIONING_MAX_INTENSITY &&
  (e.measurement_type === 'duration' || e.measurement_type === 'reps_or_duration')

/** Conditioning formats (spec §2.6): the format is the prescription, exercises fill it. */
export const CONDITIONING_FORMATS = {
  interval_30_30: { work: 30, rest: 30, rounds: 10 },
  circuit_40_20: { work: 40, rest: 20, rounds: 4 },
} as const

function durationExercise(ex: V2Exercise, order: number, seconds: number, rest: number) {
  return {
    exercise_slug: ex.slug, order_index: order, notes: '',
    target_sets: 1, target_reps_min: -1, target_reps_max: -1,
    target_duration_seconds: seconds, target_distance_meters: -1,
    target_rest_seconds: rest, target_load_type: 'bodyweight' as const, target_load_value: -1,
  }
}

export function buildMobilitySession(input: {
  day: PlacedDay
  exercises: V2Exercise[]
  orderIndex: number
}): { session: PlannedSessionLike; notes: string[] } | null {
  const { day, exercises, orderIndex } = input
  const pool = exercises.filter((e) => e.category_slug === 'mobility').sort(byIntensityThenSlug)
  if (pool.length < 3) return null

  const picked = pool.slice(0, Math.min(7, Math.max(5, pool.length >= 5 ? 5 : pool.length)))
  return {
    session: {
      name: 'Mobility-Einheit',
      mode_slug: 'recovery',
      estimated_duration_minutes: day.minutes,
      day_of_week: day.day_of_week,
      order_index: orderIndex,
      session_type: 'mobility',
      description: 'Beweglichkeit und Regeneration — ruhiger Reiz am Ruhetag.',
      pause_between_sets: 15,
      flexible_window: day.flexible_window,
      blocks: [{
        block_type: 'mobility', order_index: 0, focused_category_slug: 'mobility',
        exercises: picked.map((e, i) => durationExercise(e, i, 45, 15)),
      }],
    },
    notes: [],
  }
}

/** Maschinen-Übungen (Spec §7.2) — Pool-Präsenz IST der Verfügbarkeitsbeweis,
 *  der Pool ist bereits equipment-/env-gefiltert. */
export const MACHINE_SLUGS = ['treadmill_run', 'stationary_bike_ride', 'rowing_erg', 'air_bike_ride']
/** Lauf-Deckel (Spec §1.1): wer 60 min einstellt, erwartet Krafttraining,
 *  keinen einstündigen Lauf — der Rest des Zeitfensters bleibt unverplant. */
export const EXTENSIVE_RUN_CAP_MINUTES = 35

const EXTENSIVE_DESCRIPTION = 'Lockere Dauerarbeit für die aerobe Basis — du solltest dich nebenbei unterhalten können.'
const EXTENSIVE_CAPPED_DESCRIPTION = 'Lockere Dauerarbeit für die aerobe Basis — bewusst kürzer als dein Zeitfenster: mehr Umfang bringt heute nichts, er würde nur ermüden.'

export type ConditioningSessionInput = {
  day: PlacedDay
  exercises: V2Exercise[]
  orderIndex: number
  format?: ConditioningFormat       // default 'intensive' (Back-Compat für Alt-Aufrufer)
  planCount?: number                // default 0 — deterministische Rotation (Spec §3)
  sportGroup?: string
  runAnchor?: V2Exercise | null     // easy_jog aus dem Outdoor-Pool; null = kein Outdoor
}

/** Inhalt des Conditioning-Blocks eines Formats + Session-Metadaten. */
type FormatContent = {
  exercises: any[]
  estimatedMinutes: number
  name: string
  description: string
  pause: number
}

/** Extensiv (Spec §1.1): Varianten-Kette Lauf → Maschine → Zirkel; null = unfüllbar. */
function buildExtensiveContent(input: ConditioningSessionInput, pool: V2Exercise[]): FormatContent | null {
  const { day, runAnchor } = input
  const planCount = input.planCount ?? 0
  if (runAnchor) {
    const minutes = Math.min(EXTENSIVE_RUN_CAP_MINUTES, day.minutes - 8)
    const capped = day.minutes - 8 > EXTENSIVE_RUN_CAP_MINUTES
    return {
      exercises: [{ ...durationExercise(runAnchor, 0, minutes * 60, 0), target_rounds: 1 }],
      estimatedMinutes: minutes + 8,
      name: 'Conditioning — Basis',
      description: capped ? EXTENSIVE_CAPPED_DESCRIPTION : EXTENSIVE_DESCRIPTION,
      pause: 0,
    }
  }
  const machines = pool.filter((e) => MACHINE_SLUGS.includes(e.slug)).sort(byIntensityThenSlug)
  if (machines.length > 0) {
    const m = machines[planCount % machines.length]
    return {
      exercises: [{ ...durationExercise(m, 0, 420, 90), target_rounds: 3 }],
      estimatedMinutes: 34, // 3 × (7 min + 90 s) + 8 min Rahmen
      name: 'Conditioning — Basis',
      description: EXTENSIVE_DESCRIPTION,
      pause: 90,
    }
  }
  const circuit = pool.filter((e) => (e.intensity_score ?? 5) <= 5)
  if (circuit.length >= 3) {
    const offset = planCount % circuit.length
    const picks = [0, 1, 2].map((i) => circuit[(offset + i) % circuit.length])
    return {
      exercises: picks.map((e, i) => ({ ...durationExercise(e, i, 180, 60), target_rounds: 2 })),
      estimatedMinutes: 32, // 2 Runden × 3 Stationen × 4 min + 8 min Rahmen
      name: 'Conditioning — Basis',
      description: EXTENSIVE_DESCRIPTION,
      pause: 60,
    }
  }
  return null
}

/** Intensiv (Spec §1.2): bisherige Logik unverändert — 30/30 bzw. 40/20 nach Pool-Intensität. */
function buildIntensiveContent(day: PlacedDay, pool: V2Exercise[]): FormatContent | null {
  if (pool.length < 3) return null
  const intense = pool.filter((e) => (e.intensity_score ?? 0) >= 5)
  const format = intense.length >= 4 ? CONDITIONING_FORMATS.circuit_40_20 : CONDITIONING_FORMATS.interval_30_30
  const picked = pool.slice(0, Math.min(5, Math.max(3, pool.length)))
  return {
    exercises: picked.map((e, i) => ({
      ...durationExercise(e, i, format.work, format.rest),
      target_rounds: format.rounds,
    })),
    estimatedMinutes: day.minutes,
    name: 'Conditioning — Intervalle',
    description: 'Intervall-Arbeit für die Ausdauer-Basis — Format vor Übung.',
    pause: format.rest,
  }
}

export function buildConditioningSession(input: ConditioningSessionInput): { session: PlannedSessionLike; notes: string[] } | null {
  const { day, exercises, orderIndex } = input
  const pool = exercises.filter(isConditioningExercise).sort(byIntensityThenSlug)
  const notes: string[] = []

  // Format-Auswahl mit Degradierung (Spec §3.5): unfüllbare Formate fallen auf intensiv.
  let content: FormatContent | null = null
  const requested = input.format ?? 'intensive'
  if (requested === 'extensive') {
    content = buildExtensiveContent(input, pool)
    if (!content) notes.push('Extensiv nicht füllbar — degradiert auf intensiv')
  }
  if (!content) content = buildIntensiveContent(day, pool)
  if (!content) return null

  const mobilityPool = exercises.filter((e) => e.category_slug === 'mobility').sort(byIntensityThenSlug)
  // Legacy-Block-Tag respektieren (QA 09.10.): kein Box Breathing im Warmup
  const warmupPicks = mobilityPool.filter((e) => legacyBlockAllows(e, 'warmup')).slice(0, 2)
  const warmupSlugs = new Set(warmupPicks.map((e) => e.slug))
  const cooldownPicks = mobilityPool.filter((e) => legacyBlockAllows(e, 'cooldown') && !warmupSlugs.has(e.slug)).slice(0, 2)

  return {
    session: {
      name: content.name,
      mode_slug: 'full',
      estimated_duration_minutes: content.estimatedMinutes,
      day_of_week: day.day_of_week,
      order_index: orderIndex,
      session_type: 'conditioning',
      description: content.description,
      pause_between_sets: content.pause,
      blocks: [
        {
          block_type: 'warmup', order_index: 0, focused_category_slug: 'mobility',
          exercises: warmupPicks.map((e, i) => durationExercise(e, i, 45, 15)),
        },
        {
          block_type: 'conditioning', order_index: 1, focused_category_slug: 'lower_body_plyometrics',
          exercises: content.exercises,
        },
        {
          block_type: 'cooldown', order_index: 2, focused_category_slug: 'mobility',
          exercises: cooldownPicks.map((e, i) => durationExercise(e, i, 45, 15)),
        },
      ],
    },
    notes,
  }
}

/** Integrated conditioning finisher (~10 min at the end of a workout) — the
 *  fallback carrier when conditioning level >= 2 has no own day. Compact
 *  interval format; the week-layout engine already budgeted its minutes
 *  (CONDITIONING_FINISHER_MINUTES), so it displaces content, never extends
 *  the session. Returns null below 2 slugs (never an empty/thin block). */
export function buildConditioningFinisherBlock(
  poolSlugs: string[],
  orderIndex: number,
): { block_type: string; order_index: number; focused_category_slug: string; exercises: any[] } | null {
  if (poolSlugs.length < 2) return null
  const format = CONDITIONING_FORMATS.interval_30_30
  const picked = [...poolSlugs].sort().slice(0, 3)
  return {
    block_type: 'conditioning',
    order_index: orderIndex,
    focused_category_slug: 'lower_body_plyometrics',
    exercises: picked.map((slug, i) => ({
      exercise_slug: slug, order_index: i, notes: '',
      target_sets: 1, target_reps_min: -1, target_reps_max: -1,
      target_duration_seconds: format.work, target_distance_meters: -1,
      target_rest_seconds: format.rest, target_load_type: 'bodyweight' as const,
      target_load_value: -1, target_rounds: Math.max(4, Math.round(format.rounds / 2)),
    })),
  }
}

/** Shared conditioning pool filter (used by the standalone session and the finisher). */
export function conditioningPoolSlugs(exercises: V2Exercise[]): string[] {
  return exercises.filter(isConditioningExercise).sort(byIntensityThenSlug).map((e) => e.slug)
}
