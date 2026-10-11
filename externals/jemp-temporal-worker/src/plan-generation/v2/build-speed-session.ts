// Deterministic speed-session builder (spec §2.5). Pure: no IO, no randomness —
// picks by ascending intensity then slug so the same input yields the same session.

import type { PlacedDay } from '../week-layout'
import { legacyBlockAllows, SPEED_FRAMING_SLUGS, type V2Exercise } from './pool'

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
  /** Flexible-Window (Spec 2026-10-09): erlaubte Wochentage; day_of_week = Empfehlung. */
  flexible_window?: number[]
  /** Explizite Session-Umgebung (Sprint-Env-Fix 09.10.: Speed = Outdoor);
   *  fehlt sie, fällt save-plan auf die erste User-Umgebung zurück. */
  environment_id?: string
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

// Slug-Anker des Coaching-Templates (09.10.): Traben rahmt die Session,
// Steigerungsläufe schließen die Warmup-Rampe ab. Die Menge dieser Anker
// (SPEED_FRAMING_SLUGS in pool.ts) hält sie aus den Workout-Warmups heraus.
const EASY_JOG_SLUG = 'easy_jog'
const BUILD_UP_RUN_SLUG = 'build_up_run'
// Kampfsportler sprinten bevorzugt bergauf/Treppe (hohe Kraftkomponente,
// geringe Aufprall-Last) — Feld-/Teamsportler flach.
const COMBAT_SPRINT_PREFERENCE = ['hill_sprint', 'stair_sprint']

export function buildSpeedSession(input: {
  day: PlacedDay
  exercises: V2Exercise[]
  levels: { sprints: number; cod: number }
  allowMaxVelocity: boolean
  orderIndex: number
  /** Outdoor-Umgebung der Session (Sprint-Env-Fix 09.10.) */
  environmentId?: string
  /** sports.group_name — steuert die Wahl der Haupt-Sprintübung. */
  sportGroup?: string
}): { session: PlannedSessionLike; notes: string[] } | null {
  const { day, exercises, levels, allowMaxVelocity, orderIndex, environmentId, sportGroup } = input
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
  const cooldownMobility = mobilityPool.filter((e) => legacyBlockAllows(e, 'cooldown'))
  const jog = exercises.find((e) => e.slug === EASY_JOG_SLUG) ?? null
  const buildUpRun = exercises.find((e) => e.slug === BUILD_UP_RUN_SLUG) ?? null
  // Dynamische Mobility (Leg Swings, Hüftöffner, Ankle Rockers): warmup-getaggt
  // aus mobility ODER lower_body_plyometrics (Leg Swings leben dort).
  const dynamicPool = exercises
    .filter((e) => !SPEED_FRAMING_SLUGS.has(e.slug) && e.sprint_type === null)
    .filter((e) => (e.category_slug === 'mobility' || e.category_slug === 'lower_body_plyometrics') && legacyBlockAllows(e, 'warmup'))
    .filter((e) => (e.intensity_score ?? 10) <= 3)
    .sort(byIntensityThenSlug)
  // Lauf-ABC (A-/B-Skips, High Knees, Butt Kicks): Kategorie sprints ohne
  // sprint_type, warmup-getaggt. Intensität 4–5 ist hier normal — kein ≤3-Gate.
  const drillPool = exercises
    .filter((e) => e.category_slug === 'sprints' && e.sprint_type === null && legacyBlockAllows(e, 'warmup'))
    .filter((e) => !SPEED_FRAMING_SLUGS.has(e.slug))
    .sort(byIntensityThenSlug)

  if (sprintPool.length === 0 && codPool.length === 0) {
    return null
  }
  if (!allowMaxVelocity) notes.push('Speed: Max-Velocity gesperrt (kein gemessener Sprint-Wert oder Distanz <20m)')

  const maintenance = day.dose === 'maintenance'

  // Hauptteil (Template 09.10.): GENAU EINE Antritts-Übung, 6–8 Starts à ~20m,
  // volle Pausen — Qualität schlägt Volumen (~150m Gesamtstrecke). Die Übung
  // passt zum Sportler: Kampfsport → Berg-/Treppensprint, sonst flacher Antritt.
  const combatPick = sportGroup === 'combat_sports'
    ? COMBAT_SPRINT_PREFERENCE.map((slug) => sprintPool.find((e) => e.slug === slug)).find(Boolean)
    : undefined
  const mainSprint = combatPick ?? sprintPool[0]
  const sprintExercises = mainSprint ? [{
    ...baseExercise(mainSprint, 0),
    target_sets: maintenance ? 3 : 7,
    target_distance_meters: 20,
    target_rest_seconds: 150,
  }] : []

  // COD optional: max 2 Drills, 4–6 Wiederholungen gesamt, volle Pausen.
  const codCount = levels.cod > 0 ? Math.min(2, codPool.length) : 0
  const codExercises = codPool.slice(0, codCount).map((e, i) => ({
    ...baseExercise(e, i),
    target_sets: maintenance ? 2 : (codCount === 1 ? 5 : 3),
    // Dosierungs-Härtung (11.10.): ohne Distanz stand "5 Sätze nichts" in der
    // App — 20 m deckt Shuttle/Shuffle-Drills (z. B. 2×10 m) sinnvoll ab.
    target_distance_meters: 20,
    target_rest_seconds: 120,
  }))

  // Warmup-Rampe: Traben → dynamische Mobility → Lauf-ABC → Steigerungsläufe.
  // Kalt sprinten ist der direkteste Weg zum Hamstring-Riss — der Warmup ist
  // hier Programm, kein Vorgeplänkel.
  const warmupExercises = [
    ...(jog ? [{ ...baseExercise(jog, 0), target_duration_seconds: 240, target_rest_seconds: 0 }] : []),
    ...dynamicPool.slice(0, 2).map((e) => ({ ...baseExercise(e, 0), target_duration_seconds: 45, target_rest_seconds: 15 })),
    ...drillPool.slice(0, 2).map((e) => ({ ...baseExercise(e, 0), target_sets: 2, target_distance_meters: 20, target_rest_seconds: 30 })),
    ...(buildUpRun ? [{ ...baseExercise(buildUpRun, 0), target_sets: 3, target_distance_meters: 30, target_rest_seconds: 60 }] : []),
  ].map((e, i) => ({ ...e, order_index: i }))
  const warmupSlugs = new Set(warmupExercises.map((e) => e.exercise_slug))

  // Cooldown: Auslaufen + ruhige Mobility gezielt für Hüftbeuger/Hamstrings —
  // kein intensives Dehnen direkt nach maximaler Belastung.
  const targeted = (e: V2Exercise) => /hip|hamstring/.test(e.slug) ? 0 : 1
  const cooldownExercises = [
    ...(jog ? [{ ...baseExercise(jog, 0), target_duration_seconds: 180, target_rest_seconds: 0 }] : []),
    ...cooldownMobility
      .filter((e) => !warmupSlugs.has(e.slug))
      .sort((a, b) => targeted(a) - targeted(b) || byIntensityThenSlug(a, b))
      .slice(0, 2)
      .map((e) => ({ ...baseExercise(e, 0), target_duration_seconds: 45, target_rest_seconds: 15 })),
  ].map((e, i) => ({ ...e, order_index: i }))

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
      flexible_window: day.flexible_window,
      ...(environmentId ? { environment_id: environmentId } : {}),
      blocks,
    },
    notes,
  }
}
