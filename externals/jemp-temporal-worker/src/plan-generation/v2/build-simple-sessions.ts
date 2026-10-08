// Deterministic mobility + conditioning session builders (spec §2.6, §1.4).
// Pure — picks by ascending intensity then slug; formats are the prescription.

import type { PlacedDay } from '../week-layout'
import type { V2Exercise } from './pool'
import type { PlannedSessionLike } from './build-speed-session'

const byIntensityThenSlug = (a: V2Exercise, b: V2Exercise) =>
  (a.intensity_score ?? 5) - (b.intensity_score ?? 5) || a.slug.localeCompare(b.slug)

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
      blocks: [{
        block_type: 'mobility', order_index: 0, focused_category_slug: 'mobility',
        exercises: picked.map((e, i) => durationExercise(e, i, 45, 15)),
      }],
    },
    notes: [],
  }
}

export function buildConditioningSession(input: {
  day: PlacedDay
  exercises: V2Exercise[]
  orderIndex: number
}): { session: PlannedSessionLike; notes: string[] } | null {
  const { day, exercises, orderIndex } = input
  const pool = exercises
    .filter((e) =>
      (e.category_slug === 'lower_body_plyometrics' || e.category_slug === 'conditioning') &&
      e.sprint_type === null &&
      (e.measurement_type === 'duration' || e.measurement_type === 'reps_or_duration'))
    .sort(byIntensityThenSlug)
  if (pool.length < 3) return null

  const mobilityPool = exercises.filter((e) => e.category_slug === 'mobility').sort(byIntensityThenSlug)
  const intense = pool.filter((e) => (e.intensity_score ?? 0) >= 5)
  const format = intense.length >= 4 ? CONDITIONING_FORMATS.circuit_40_20 : CONDITIONING_FORMATS.interval_30_30
  const picked = pool.slice(0, Math.min(5, Math.max(3, pool.length)))

  return {
    session: {
      name: 'Conditioning-Einheit',
      mode_slug: 'full',
      estimated_duration_minutes: day.minutes,
      day_of_week: day.day_of_week,
      order_index: orderIndex,
      session_type: 'conditioning',
      description: 'Intervall-Arbeit für die Ausdauer-Basis — Format vor Übung.',
      pause_between_sets: format.rest,
      blocks: [
        {
          block_type: 'warmup', order_index: 0, focused_category_slug: 'mobility',
          exercises: mobilityPool.slice(0, 2).map((e, i) => durationExercise(e, i, 45, 15)),
        },
        {
          block_type: 'conditioning', order_index: 1, focused_category_slug: 'lower_body_plyometrics',
          exercises: picked.map((e, i) => ({
            ...durationExercise(e, i, format.work, format.rest),
            target_rounds: format.rounds,
          })),
        },
        {
          block_type: 'cooldown', order_index: 2, focused_category_slug: 'mobility',
          exercises: mobilityPool.slice(2, 4).map((e, i) => durationExercise(e, i, 45, 15)),
        },
      ],
    },
    notes: [],
  }
}
