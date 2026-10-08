import { describe, it, expect } from 'vitest'
import { findV2Violations, buildV2SessionSchema } from '../run-session-v2'

const session = (blocks: Array<{ block_type: string; slugs: string[] }>): any => ({
  name: 'W', mode_slug: 'full', estimated_duration_minutes: 60, day_of_week: 1,
  order_index: 0, session_type: 'training', description: '', pause_between_sets: 120,
  blocks: blocks.map((b, i) => ({
    block_type: b.block_type, order_index: i, focused_category_slug: 'strength',
    exercises: b.slugs.map((slug, j) => ({
      exercise_slug: slug, order_index: j, notes: '', target_sets: 3,
      target_reps_min: 5, target_reps_max: 8, target_duration_seconds: -1,
      target_distance_meters: -1, target_rest_seconds: 90,
      target_load_type: 'kg', target_load_value: 40,
    })),
  })),
})

const pools = new Map([
  ['push', { slugs: new Set(['bench_press']) }],
  ['lower_body', { slugs: new Set(['back_squat']) }],
])
const expected = ['push', 'lower_body']

describe('findV2Violations', () => {
  it('passes a valid session', () => {
    expect(findV2Violations(session([
      { block_type: 'push', slugs: ['bench_press'] },
      { block_type: 'lower_body', slugs: ['back_squat'] },
    ]), pools as any, expected)).toEqual([])
  })
  it('flags a missing block', () => {
    expect(findV2Violations(session([{ block_type: 'push', slugs: ['bench_press'] }]), pools as any, expected).join(' ')).toMatch(/lower_body/)
  })
  it('flags an unexpected block', () => {
    expect(findV2Violations(session([
      { block_type: 'push', slugs: ['bench_press'] },
      { block_type: 'lower_body', slugs: ['back_squat'] },
      { block_type: 'rotation', slugs: ['bench_press'] },
    ]), pools as any, expected).join(' ')).toMatch(/rotation/)
  })
  it('flags a foreign slug and an empty block', () => {
    const v = findV2Violations(session([
      { block_type: 'push', slugs: ['back_squat'] },
      { block_type: 'lower_body', slugs: [] },
    ]), pools as any, expected)
    expect(v.join(' ')).toMatch(/back_squat/)
    expect(v.join(' ')).toMatch(/leer|empty/i)
  })
})

describe('buildV2SessionSchema', () => {
  it('accepts planned block types and rejects others', () => {
    const schema = buildV2SessionSchema(['push', 'lower_body'], ['bench_press', 'back_squat'])
    const valid = session([
      { block_type: 'push', slugs: ['bench_press'] },
      { block_type: 'lower_body', slugs: ['back_squat'] },
    ])
    expect(schema.safeParse(valid).success).toBe(true)
    const foreign = session([
      { block_type: 'rotation', slugs: ['bench_press'] },
      { block_type: 'push', slugs: ['bench_press'] },
    ])
    expect(schema.safeParse(foreign).success).toBe(false)
  })
})
