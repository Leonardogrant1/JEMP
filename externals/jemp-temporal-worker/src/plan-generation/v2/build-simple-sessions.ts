// Deterministic mobility + conditioning session builders (spec §2.6, §1.4).
// Pure — picks by ascending intensity then slug; formats are the prescription.

import type { PlacedDay } from '../week-layout'
import { legacyBlockAllows, rotatedPoolWindow, type V2Exercise } from './pool'
import type { PlannedSessionLike } from './build-speed-session'
import type { ConditioningFormat } from './conditioning-format'

const byIntensityThenSlug = (a: V2Exercise, b: V2Exercise) =>
  (a.intensity_score ?? 5) - (b.intensity_score ?? 5) || a.slug.localeCompare(b.slug)

// Conditioning trainiert Intensität über Zeit bei sicherer Technik — nicht
// maximale Last (QA 10.10.). Maximal-Plyo gehört in den Plyo-Block (wenige
// Qualitäts-Wdh, volle Pause), nie ins Intervall; der Intensitäts-Cap hält
// auch submaximale Grenzfälle (z. B. reaktive Single-Leg-Jumps) draußen.
const CONDITIONING_MAX_INTENSITY = 7
// Minimum 3 (E2E 10.10.): Intensität-2-Übungen wie Leg Swings sind Prep/Mobility
// in Plyo-Verkleidung — als Intervall-/Zirkelstation wirkungslos.
const CONDITIONING_MIN_INTENSITY = 3
const isConditioningExercise = (e: V2Exercise) =>
  (e.category_slug === 'lower_body_plyometrics' || e.category_slug === 'conditioning') &&
  e.sprint_type === null &&
  e.plyo_type !== 'maximal' &&
  (e.intensity_score ?? 5) <= CONDITIONING_MAX_INTENSITY &&
  (e.intensity_score ?? 5) >= CONDITIONING_MIN_INTENSITY &&
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
  /** Rotations-Offset (QA 11.10.): sort().slice() wählte für jeden User in
   *  jedem Plan dieselben 5 leichtesten Übungen. */
  planCount?: number
}): { session: PlannedSessionLike; notes: string[] } | null {
  const { day, exercises, orderIndex } = input
  const pool = exercises.filter((e) => e.category_slug === 'mobility').sort(byIntensityThenSlug)
  if (pool.length < 3) return null

  // Struktur statt Liste (QA 11.10.): Opener (Atmung, 90 s) → Gelenke (CARs/
  // dynamisch leicht, 45 s) → Hauptteil (aktive/loaded Mobility Int ≥3,
  // 2 Sätze — Jefferson Curl & Co. waren durch die Intensitäts-Sortierung
  // unerreichbar) → Abschluss (restorative, 60 s). Picks rotieren mit
  // planCount, regionen-balanciert. Der Pool ist bereits level-/equipment-
  // gefiltert — wer die Loaded-Varianten sehen darf, bekommt sie.
  const offset = input.planCount ?? 0
  const used = new Set<string>()
  const take = (cands: V2Exercise[], n: number): V2Exercise[] => {
    const picks = rotatedPoolWindow(cands.filter((e) => !used.has(e.slug)), offset, n)
    for (const p of picks) used.add(p.slug)
    return picks
  }
  const dyn = (e: V2Exercise) => e.exercise_type === 'dynamic'
  // Umfang (QA 11.10.): 2 Hauptübungen ließen bei 20 min ~10 min ungenutzt —
  // 3 (bzw. 4 ab 30 min) à 2 Sätze füllen das Budget, ohne zum Krafttag zu werden.
  const mainCount = day.minutes >= 30 ? 4 : 3
  const opener = take(pool.filter((e) => e.exercise_type === 'breathing'), 1)
  const joints = take(pool.filter((e) => dyn(e) && (e.intensity_score ?? 5) <= 2), day.minutes >= 30 ? 3 : 2)
  const actives = take(pool.filter((e) => dyn(e) && (e.intensity_score ?? 5) >= 3), mainCount)
  const closer = take(pool.filter((e) => e.exercise_type === 'restorative'), 1)

  // Aktive Übungen: reps-gemessen → 2×6–8, sonst 2×45 s Hold.
  const activeExercise = (e: V2Exercise, i: number) =>
    e.measurement_type === 'reps'
      ? {
        exercise_slug: e.slug, order_index: i, notes: '',
        target_sets: 2, target_reps_min: 6, target_reps_max: 8,
        target_duration_seconds: -1, target_distance_meters: -1,
        target_rest_seconds: 30, target_load_type: 'bodyweight' as const, target_load_value: -1,
      }
      : { ...durationExercise(e, i, 45, 30), target_sets: 2 }

  const structured = opener.length + joints.length + actives.length + closer.length >= 4
    ? [
      ...opener.map((e, i) => durationExercise(e, i, 90, 15)),
      ...joints.map((e, i) => durationExercise(e, i, 45, 15)),
      ...actives.map((e, i) => activeExercise(e, i)),
      ...closer.map((e, i) => durationExercise(e, i, 60, 0)),
    ].map((e, i) => ({ ...e, order_index: i }))
    // Fallback (untypisierter/dünner Pool): bisheriges Verhalten.
    : pool
      .slice(0, Math.min(7, Math.max(5, pool.length >= 5 ? 5 : pool.length)))
      .map((e, i) => durationExercise(e, i, 45, 15))

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
        exercises: structured,
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

/** Rundentauglich = trägt 3 min am Stück (Spec §1.3) — eine echte Runde ist
 *  drei Minuten EINE Tätigkeit, die Dreiteilung ist bewusst letzte Wahl. */
export const ROUNDS_CONTINUOUS_SLUGS = ['heavy_bag_work', 'shadow_boxing', 'jump_rope_standard', 'air_bike_ride', 'rowing_erg', 'stationary_bike_ride']

const ROUNDS_DESCRIPTION = 'Rundenformat wie im Wettkampf — 3 Minuten Arbeit, 1 Minute Pause. Teile dir die Runde ein.'

/** Rounds (Spec §1.3): 3 min Arbeit / 1 min Rundenpause × 3–5; null = unfüllbar. */
function buildRoundsContent(input: ConditioningSessionInput, pool: V2Exercise[]): FormatContent | null {
  const { day, sportGroup } = input
  const planCount = input.planCount ?? 0
  const n = Math.max(3, Math.min(5, Math.floor((day.minutes - 8) / 4)))
  const candidates = pool.filter((e) => ROUNDS_CONTINUOUS_SLUGS.includes(e.slug)).sort(byIntensityThenSlug)

  if (candidates.length > 0) {
    // Kampfsport: Sack vor Shadow Boxing (analog COMBAT_SPRINT_PREFERENCE), sonst Rotation.
    const primary = (sportGroup === 'combat_sports'
      ? candidates.find((e) => e.slug === 'heavy_bag_work') ?? candidates.find((e) => e.slug === 'shadow_boxing')
      : undefined) ?? candidates[planCount % candidates.length]
    const second = candidates.find((e) => e.slug !== primary.slug)
    const entries = n >= 4 && second
      ? [{ ex: primary, rounds: Math.ceil(n / 2) }, { ex: second, rounds: Math.floor(n / 2) }]
      : [{ ex: primary, rounds: n }]
    return {
      exercises: entries.map((e2, i) => ({ ...durationExercise(e2.ex, i, 180, 60), target_rounds: e2.rounds })),
      estimatedMinutes: n * 4 + 8,
      name: 'Conditioning — Rounds',
      description: ROUNDS_DESCRIPTION,
      pause: 60,
    }
  }
  // Fallback-Dreiteilung: fühlt sich nach Circuit an, nicht nach Runde — letzte Wahl.
  if (pool.length >= 3) {
    const picks = pool.slice(0, 3)
    return {
      exercises: picks.map((e, i) => ({ ...durationExercise(e, i, 60, i === 2 ? 60 : 0), target_rounds: n })),
      estimatedMinutes: n * 4 + 8,
      name: 'Conditioning — Rounds',
      description: ROUNDS_DESCRIPTION,
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
  } else if (requested === 'rounds') {
    content = buildRoundsContent(input, pool)
    if (!content) notes.push('Rounds nicht füllbar — degradiert auf intensiv')
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
  format: 'intensive' | 'rounds' = 'intensive',
  offset = 0,
): { block_type: string; order_index: number; focused_category_slug: string; exercises: any[] } | null {
  if (poolSlugs.length < 2) return null

  const finisherExercise = (slug: string, i: number, work: number, rest: number, rounds: number) => ({
    exercise_slug: slug, order_index: i, notes: '',
    target_sets: 1, target_reps_min: -1, target_reps_max: -1,
    target_duration_seconds: work, target_distance_meters: -1,
    target_rest_seconds: rest, target_load_type: 'bodyweight' as const,
    target_load_value: -1, target_rounds: rounds,
  })
  const block = (exercises: any[]) => ({
    block_type: 'conditioning', order_index: orderIndex,
    focused_category_slug: 'lower_body_plyometrics', exercises,
  })

  // Rounds-Finisher (Spec §3.4): eine Runden-Übung, 2 × 3 min — nur wenn der
  // Pool eine rundentaugliche Übung hergibt, sonst Intervall-Verhalten.
  if (format === 'rounds') {
    const candidates = poolSlugs.filter((s) => ROUNDS_CONTINUOUS_SLUGS.includes(s)).sort()
    const pick = candidates.find((s) => s === 'heavy_bag_work')
      ?? candidates.find((s) => s === 'shadow_boxing')
      ?? candidates[offset % Math.max(1, candidates.length)]
    if (pick) return block([finisherExercise(pick, 0, 180, 60, 2)])
  }

  // Intervall (Monotonie-Fix Spec §3.4): sortiert bleibt der Pool, rotiert wird
  // der Startpunkt — statt des alten alphabetischen slice(0, 3).
  const sorted = [...poolSlugs].sort()
  const count = Math.min(3, sorted.length)
  const start = offset % sorted.length
  const picked = Array.from({ length: count }, (_, i) => sorted[(start + i) % sorted.length])
  const intervalFormat = CONDITIONING_FORMATS.interval_30_30
  return block(picked.map((slug, i) =>
    finisherExercise(slug, i, intervalFormat.work, intervalFormat.rest, Math.max(4, Math.round(intervalFormat.rounds / 2)))))
}

/** Shared conditioning pool filter (used by the standalone session and the finisher). */
export function conditioningPoolSlugs(exercises: V2Exercise[]): string[] {
  return exercises.filter(isConditioningExercise).sort(byIntensityThenSlug).map((e) => e.slug)
}
