// Deterministic speed-session builder (spec §2.5). Pure: no IO, no randomness —
// picks by ascending intensity then slug so the same input yields the same session.

import type { PlacedDay } from '../week-layout'
import type { V2Exercise } from './pool'

type PlannedExercise = {
  exercise_slug: string
  order_index: number
  notes: string
  target_sets: number
  target_reps_min: number
  target_reps_max: number
  target_duration_seconds: number
  target_distance_meters: number
  target_rest_seconds: number
  target_load_type: 'bodyweight' | 'kg' | 'rpe' | 'pace'
  target_load_value: number
  target_rounds?: number | null
}

type PlannedBlock = {
  block_type: string
  order_index: number
  focused_category_slug: string
  exercises: PlannedExercise[]
}

export type PlannedSessionLike = {
  name: string
  mode_slug: 'full' | 'reduced' | 'activation' | 'recovery'
  estimated_duration_minutes: number
  day_of_week: number
  order_index: number
  session_type: 'training' | 'recovery' | 'speed' | 'mobility' | 'conditioning'
  description: string
  pause_between_sets: number
  dropped_blocks?: Array<{ block_type: string; reason: 'time' | 'coverage' }>
  blocks: PlannedBlock[]
}

const byIntensityThenSlug = (a: V2Exercise, b: V2Exercise) =>
  (a.intensity_score ?? 5) - (b.intensity_score ?? 5) || a.slug.localeCompare(b.slug)

function baseExercise(ex: V2Exercise, order: number): PlannedExercise {
  return {
    exercise_slug: ex.slug, order_index: order, notes: '',
    target_sets: 1, target_reps_min: -1, target_reps_max: -1,
    target_duration_seconds: -1, target_distance_meters: -1,
    target_rest_seconds: 90, target_load_type: 'bodyweight', target_load_value: -1,
  }
}

export function buildSpeedSession(input: {
  day: PlacedDay
  exercises: V2Exercise[]
  levels: { sprints: number; cod: number }
  allowMaxVelocity: boolean
  orderIndex: number
}): { session: PlannedSessionLike; notes: string[] } | null {
  const { day, exercises, levels, allowMaxVelocity, orderIndex } = input
  const notes: string[] = []

  const sprintPool = exercises
    .filter((e) => e.sprint_type !== null)
    .filter((e) => allowMaxVelocity || e.sprint_type !== 'max_velocity')
    .sort(byIntensityThenSlug)
  const codPool = exercises
    .filter((e) => e.category_slug === 'cod' ||
      (e.category_slug === 'lower_body_plyometrics' && e.sprint_type === null && e.measurement_type === 'time'))
    .sort(byIntensityThenSlug)
  const mobilityPool = exercises.filter((e) => e.category_slug === 'mobility').sort(byIntensityThenSlug)
  // Sprint-Technik-Drills (A-/B-Skips, Wall Drills — Kategorie sprints ohne
  // sprint_type): gehören laut Spec in den Drill-Teil des Speed-Warmups.
  const drillPool = exercises
    .filter((e) => e.category_slug === 'sprints' && e.sprint_type === null && (e.intensity_score ?? 10) <= 3)
    .sort(byIntensityThenSlug)

  if (sprintPool.length === 0 && codPool.length === 0) {
    return null
  }
  if (!allowMaxVelocity) notes.push('Speed: Max-Velocity gesperrt (kein gemessener Sprint-Wert oder Distanz <20m)')

  // Content split proportional to the two pillar levels (spec §2.5).
  const totalMain = 4
  const levelSum = Math.max(1, levels.sprints + levels.cod)
  let sprintCount = Math.round((levels.sprints / levelSum) * totalMain)
  sprintCount = Math.min(Math.max(sprintCount, sprintPool.length > 0 ? 1 : 0), sprintPool.length)
  const codCount = Math.min(totalMain - sprintCount, codPool.length)

  const maintenance = day.dose === 'maintenance'
  const sprintExercises = sprintPool.slice(0, sprintCount).map((e, i) => ({
    ...baseExercise(e, i),
    target_sets: maintenance ? 2 : 4,
    target_distance_meters: maintenance ? 20 : 30,
    target_rest_seconds: 120,
  }))
  const codExercises = codPool.slice(0, codCount).map((e, i) => ({
    ...baseExercise(e, i),
    target_sets: maintenance ? 2 : 3,
    target_rest_seconds: 90,
  }))
  const warmupExercises = [...mobilityPool.slice(0, 2), ...drillPool.slice(0, 2)].map((e, i) => ({
    ...baseExercise(e, i), target_duration_seconds: 45, target_rest_seconds: 15,
  }))
  const cooldownExercises = mobilityPool.slice(2, 4).map((e, i) => ({
    ...baseExercise(e, i), target_duration_seconds: 45, target_rest_seconds: 15,
  }))

  const blocks: PlannedBlock[] = []
  blocks.push({ block_type: 'warmup', order_index: 0, focused_category_slug: 'mobility', exercises: warmupExercises })
  if (sprintExercises.length > 0) blocks.push({ block_type: 'sprint', order_index: 1, focused_category_slug: 'sprints', exercises: sprintExercises })
  if (codExercises.length > 0) blocks.push({ block_type: 'cod', order_index: 2, focused_category_slug: 'cod', exercises: codExercises })
  blocks.push({ block_type: 'cooldown', order_index: 3, focused_category_slug: 'mobility', exercises: cooldownExercises })

  return {
    session: {
      name: 'Sprint-Einheit',
      mode_slug: maintenance ? 'reduced' : 'full',
      estimated_duration_minutes: day.minutes,
      day_of_week: day.day_of_week,
      order_index: orderIndex,
      session_type: 'speed',
      description: 'Antritt, Richtungswechsel und Laufmechanik — draußen, ohne Equipment.',
      pause_between_sets: 120,
      blocks,
    },
    notes,
  }
}
