import { describe, expect, it } from 'vitest'
import { enforceMeasurementTypes } from '../run-session-v2'

const mk = (over: Partial<any>): any => ({
  exercise_slug: 'x', target_reps_min: 0, target_reps_max: 0,
  target_duration_seconds: 0, target_distance_meters: 0, ...over,
})

describe('enforceMeasurementTypes (QA 19.10.)', () => {
  it('Dauer-Übung mit Dauer UND Reps: Reps werden genullt (high_knees 2×15–20-Befund)', () => {
    const blocks = [{ exercises: [mk({ exercise_slug: 'high_knees', target_duration_seconds: 15, target_reps_min: 15, target_reps_max: 20 })] }]
    enforceMeasurementTypes(blocks, { high_knees: 'duration' })
    expect(blocks[0].exercises[0].target_reps_min).toBe(0)
    expect(blocks[0].exercises[0].target_reps_max).toBe(0)
    expect(blocks[0].exercises[0].target_duration_seconds).toBe(15)
  })
  it('Dauer-Übung nur mit Reps: 15s-Drill-Default, Reps weg (Fallback nach Retry-Kette)', () => {
    const blocks = [{ exercises: [mk({ exercise_slug: 'a_skip_drill', target_reps_min: 10, target_reps_max: 12 })] }]
    enforceMeasurementTypes(blocks, { a_skip_drill: 'duration' })
    expect(blocks[0].exercises[0].target_duration_seconds).toBe(15)
    expect(blocks[0].exercises[0].target_reps_max).toBe(0)
  })
  it('Distanz-Übung mit Distanz: Reps weg; Reps-Übungen bleiben unberührt', () => {
    const blocks = [{ exercises: [
      mk({ exercise_slug: 'sprint_20m', target_distance_meters: 20, target_reps_min: 2, target_reps_max: 2 }),
      mk({ exercise_slug: 'push_up', target_reps_min: 8, target_reps_max: 12 }),
    ] }]
    enforceMeasurementTypes(blocks, { sprint_20m: 'distance', push_up: 'reps' })
    expect(blocks[0].exercises[0].target_reps_max).toBe(0)
    expect(blocks[0].exercises[1].target_reps_max).toBe(12)
  })
  it('reps_or_duration und unbekannte Slugs bleiben unangetastet', () => {
    const blocks = [{ exercises: [mk({ exercise_slug: 'cossack_squat', target_reps_min: 6, target_reps_max: 8 })] }]
    enforceMeasurementTypes(blocks, { cossack_squat: 'reps_or_duration' })
    expect(blocks[0].exercises[0].target_reps_max).toBe(8)
    enforceMeasurementTypes(blocks, undefined)
    expect(blocks[0].exercises[0].target_reps_max).toBe(8)
  })
})
