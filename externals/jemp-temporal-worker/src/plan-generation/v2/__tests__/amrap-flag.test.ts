import { describe, expect, it } from 'vitest'
import { flagAmrapExercises } from '../run-session-v2'

const mk = (over: Partial<any>): any => ({
  exercise_slug: 'x', target_reps_min: 8, target_reps_max: 12,
  target_duration_seconds: 0, target_load_type: 'bodyweight', target_load_value: -1,
  ...over,
})

describe('flagAmrapExercises (QA 20.10. — Regel beim v2-Umbau verloren)', () => {
  it('Bodyweight-Reps im Kraftblock: is_amrap gesetzt', () => {
    const blocks = [{ block_type: 'upper_strength', exercises: [mk({ exercise_slug: 'push_up' })] }]
    flagAmrapExercises(blocks)
    expect((blocks[0].exercises[0] as any).is_amrap).toBe(true)
  })
  it('Core-Block ist abgedeckt (ab_wheel_rollout 6–8-Befund)', () => {
    const blocks = [{ block_type: 'core', exercises: [mk({ exercise_slug: 'ab_wheel_rollout', target_reps_min: 6, target_reps_max: 8 })] }]
    flagAmrapExercises(blocks)
    expect((blocks[0].exercises[0] as any).is_amrap).toBe(true)
  })
  it('geladene Übung im Kraftblock: kein Flag', () => {
    const blocks = [{ block_type: 'lower_strength', exercises: [mk({ exercise_slug: 'back_squat', target_load_type: 'rpe', target_load_value: 7 })] }]
    flagAmrapExercises(blocks)
    expect((blocks[0].exercises[0] as any).is_amrap).toBeUndefined()
  })
  it('Duration-Übung (Plank) im Core-Block: kein Flag', () => {
    const blocks = [{ block_type: 'core', exercises: [mk({ exercise_slug: 'plank', target_reps_min: 0, target_reps_max: 0, target_duration_seconds: 45 })] }]
    flagAmrapExercises(blocks)
    expect((blocks[0].exercises[0] as any).is_amrap).toBeUndefined()
  })
  it('Plyo/Warmup/Accessory bleiben außen vor (Explosiv-/Aktivierungsarbeit)', () => {
    const blocks = [
      { block_type: 'plyo', exercises: [mk({ exercise_slug: 'box_jump', target_reps_min: 3, target_reps_max: 5 })] },
      { block_type: 'warmup', exercises: [mk({ exercise_slug: 'arm_circle', target_reps_min: 10, target_reps_max: 10 })] },
      { block_type: 'accessory', exercises: [mk({ exercise_slug: 'scap_push_up', target_reps_min: 10, target_reps_max: 12 })] },
    ]
    flagAmrapExercises(blocks)
    for (const b of blocks) expect((b.exercises[0] as any).is_amrap).toBeUndefined()
  })
  it('Legacy-Kraftblöcke (push/pull/lower_body) sind abgedeckt', () => {
    const blocks = [{ block_type: 'pull', exercises: [mk({ exercise_slug: 'towel_door_row' })] }]
    flagAmrapExercises(blocks)
    expect((blocks[0].exercises[0] as any).is_amrap).toBe(true)
  })
})
