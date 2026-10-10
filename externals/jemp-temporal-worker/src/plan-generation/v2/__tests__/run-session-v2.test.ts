import { describe, it, expect } from 'vitest'
import { findV2Violations, buildV2SessionSchema, attachBlockEmphasis } from '../run-session-v2'

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

describe('attachBlockEmphasis', () => {
  const planned = [
    { block_type: 'warmup' },
    { block_type: 'plyo', emphasis: 'light' },
    { block_type: 'lower_body', emphasis: 'heavy' },
    { block_type: 'push', emphasis: 'normal' },
    { block_type: 'cooldown' },
  ] as any

  it('copies emphasis from the planned composition onto LLM blocks by block_type', () => {
    const blocks = [
      { block_type: 'warmup', order_index: 0 },
      { block_type: 'plyo', order_index: 1 },
      { block_type: 'lower_body', order_index: 2 },
      { block_type: 'push', order_index: 3 },
      { block_type: 'cooldown', order_index: 4 },
    ] as any
    attachBlockEmphasis(blocks, planned)
    expect(blocks.map((b: any) => b.emphasis ?? null)).toEqual([null, 'light', 'heavy', 'normal', null])
  })

  it('leaves blocks without a planned counterpart (sprint, finisher) untouched', () => {
    const blocks = [
      { block_type: 'sprint', order_index: 0 },
      { block_type: 'lower_body', order_index: 1 },
      { block_type: 'conditioning', order_index: 2 },
    ] as any
    attachBlockEmphasis(blocks, planned)
    expect(blocks[0].emphasis).toBeUndefined()
    expect(blocks[1].emphasis).toBe('heavy')
    expect(blocks[2].emphasis).toBeUndefined()
  })

  it('assigns duplicate block_types in order of occurrence', () => {
    const twoAccessories = [
      { block_type: 'accessory', emphasis: 'normal' },
      { block_type: 'accessory', emphasis: 'light' },
    ] as any
    const blocks = [
      { block_type: 'accessory', order_index: 0 },
      { block_type: 'accessory', order_index: 1 },
    ] as any
    attachBlockEmphasis(blocks, twoAccessories)
    expect(blocks.map((b: any) => b.emphasis)).toEqual(['normal', 'light'])
  })
})

describe('Pattern-Anforderungen im Validator (Spec 2026-10-10 §1.2)', () => {
  const reqs = [
    { block_type: 'upper_strength', pattern: 'push_vertical', emphasis: 'heavy', slugs: new Set(['ohp']) },
    { block_type: 'upper_strength', pattern: 'pull_horizontal', emphasis: 'normal', slugs: new Set(['row']) },
  ] as any
  const upPools = new Map([['upper_strength', { slugs: new Set(['ohp', 'row', 'bench']) }]])
  it('ok, wenn jedes Pattern vertreten ist', () => {
    const s = session([{ block_type: 'upper_strength', slugs: ['ohp', 'row'] }])
    expect(findV2Violations(s, upPools as any, ['upper_strength'], reqs)).toEqual([])
  })
  it('Verletzung, wenn Pull fehlt (zwei Push-Übungen)', () => {
    const s = session([{ block_type: 'upper_strength', slugs: ['ohp', 'bench'] }])
    expect(findV2Violations(s, upPools as any, ['upper_strength'], reqs).join(' ')).toMatch(/pull_horizontal/)
  })
  it('fehlender Block erzeugt keine doppelte Pattern-Meldung (wird oben gemeldet)', () => {
    const s = session([])
    const v = findV2Violations(s, upPools as any, ['upper_strength'], reqs)
    expect(v.filter((x) => /pull_horizontal/.test(x))).toHaveLength(0)
  })
})
