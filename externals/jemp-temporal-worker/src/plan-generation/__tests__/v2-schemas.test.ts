import { describe, it, expect } from 'vitest'
import { sessionSchema } from '../schemas'

const exercise = {
  exercise_slug: 'pogos', order_index: 0, notes: '', target_sets: 3,
  target_reps_min: 10, target_reps_max: 12, target_duration_seconds: -1,
  target_distance_meters: -1, target_rest_seconds: 60,
  target_load_type: 'bodyweight' as const, target_load_value: -1,
}

describe('widened static schemas (v2)', () => {
  it('accepts a speed session with sprint/cod blocks and target_rounds', () => {
    const parsed = sessionSchema.safeParse({
      name: 'Sprint-Einheit', mode_slug: 'full', estimated_duration_minutes: 35,
      day_of_week: 1, order_index: 0, session_type: 'speed', description: '',
      pause_between_sets: 120,
      dropped_blocks: [{ block_type: 'rotation', reason: 'time' }],
      blocks: [
        { block_type: 'warmup', order_index: 0, focused_category_slug: 'mobility', exercises: [exercise] },
        { block_type: 'sprint', order_index: 1, focused_category_slug: 'sprints', exercises: [{ ...exercise, target_rounds: 4 }] },
        { block_type: 'cod', order_index: 2, focused_category_slug: 'cod', exercises: [exercise] },
      ],
    })
    expect(parsed.success).toBe(true)
  })

  it('still accepts a legacy training session unchanged', () => {
    const parsed = sessionSchema.safeParse({
      name: 'Workout', mode_slug: 'full', estimated_duration_minutes: 60,
      day_of_week: 2, order_index: 0, session_type: 'training', description: '',
      pause_between_sets: 120,
      blocks: [{ block_type: 'primary', order_index: 0, focused_category_slug: 'strength', exercises: [exercise] }],
    })
    expect(parsed.success).toBe(true)
  })
})
