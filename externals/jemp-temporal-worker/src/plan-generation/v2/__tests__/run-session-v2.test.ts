import { describe, it, expect } from 'vitest'
import { findV2Violations, buildV2SessionSchema, attachBlockEmphasis, withMeasurementMarkers, zeroWarmupCooldownRest, fixZeroKgLoads } from '../run-session-v2'

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

describe('Dosierungs-Härtung (QA 11.10.): Validator statt Prompt-Hoffnung', () => {
  const dosed = (over: Record<string, unknown> = {}) => ({
    exercise_slug: 'bench_press', order_index: 0, notes: '', target_sets: 3,
    target_reps_min: 5, target_reps_max: 8, target_duration_seconds: 0,
    target_distance_meters: 0, target_rest_seconds: 90,
    target_load_type: 'kg', target_load_value: 40, ...over,
  })
  const wrap = (exercises: any[], block_type = 'push'): any => ({
    blocks: [{ block_type, order_index: 0, focused_category_slug: 'strength', exercises }],
  })
  const p = new Map([['push', { slugs: new Set(['bench_press', 'push_up']) }]])

  it('Übung ohne Reps, Dauer und Distanz → Verletzung (lateral_shuffle-Fall)', () => {
    const s = wrap([dosed({ target_reps_min: 0, target_reps_max: 0 })])
    const v = findV2Violations(s, p as any, ['push'])
    expect(v.join(' ')).toMatch(/bench_press/)
    expect(v.join(' ')).toMatch(/Dosierung/)
  })

  it('negative Platzhalter-Werte zählen nicht als Dosis', () => {
    const s = wrap([dosed({ target_reps_min: 0, target_reps_max: 0, target_duration_seconds: -1, target_distance_meters: -1 })])
    expect(findV2Violations(s, p as any, ['push']).join(' ')).toMatch(/Dosierung/)
  })

  it('Dauer ODER Distanz genügen als Dosis', () => {
    expect(findV2Violations(wrap([dosed({ target_reps_min: 0, target_reps_max: 0, target_duration_seconds: 180 })]), p as any, ['push'])).toEqual([])
    expect(findV2Violations(wrap([dosed({ target_reps_min: 0, target_reps_max: 0, target_distance_meters: 20 })]), p as any, ['push'])).toEqual([])
  })

  it('kg mit Last 0 → Verletzung (Deadlift-@0-Fall); rpe/bodyweight mit 0 ok', () => {
    const v = findV2Violations(wrap([dosed({ target_load_value: 0 })]), p as any, ['push'])
    expect(v.join(' ')).toMatch(/bench_press/)
    expect(v.join(' ')).toMatch(/Last|kg/)
    expect(findV2Violations(wrap([dosed({ target_load_type: 'rpe', target_load_value: 0 })]), p as any, ['push'])).toEqual([])
    expect(findV2Violations(wrap([dosed({ target_load_type: 'bodyweight', target_load_value: 0 })]), p as any, ['push'])).toEqual([])
  })

  it('Warmup ohne CNS-Mikro-Dosis → Verletzung mit Kandidatenliste', () => {
    const pools2 = new Map([['warmup', { slugs: new Set(['hip_cars', 'high_knees']) }]])
    const noCns = wrap([dosed({ exercise_slug: 'hip_cars', target_load_type: 'bodyweight' })], 'warmup')
    const v = findV2Violations(noCns, pools2 as any, ['warmup'], [], { warmupCnsSlugs: ['high_knees'] })
    expect(v.join(' ')).toMatch(/CNS/)
    expect(v.join(' ')).toMatch(/high_knees/)
  })

  it('Warmup mit CNS-Übung ok; leere Kandidatenliste → kein Check (Datenloch degradiert)', () => {
    const pools2 = new Map([['warmup', { slugs: new Set(['hip_cars', 'high_knees']) }]])
    const withCns = wrap([
      dosed({ exercise_slug: 'hip_cars', target_load_type: 'bodyweight' }),
      dosed({ exercise_slug: 'high_knees', order_index: 1, target_load_type: 'bodyweight' }),
    ], 'warmup')
    expect(findV2Violations(withCns, pools2 as any, ['warmup'], [], { warmupCnsSlugs: ['high_knees'] })).toEqual([])
    const noCns = wrap([dosed({ exercise_slug: 'hip_cars', target_load_type: 'bodyweight' })], 'warmup')
    expect(findV2Violations(noCns, pools2 as any, ['warmup'], [], { warmupCnsSlugs: [] })).toEqual([])
    expect(findV2Violations(noCns, pools2 as any, ['warmup'])).toEqual([])
  })
})

describe('Mess-Typ-Validierung (QA 11.10.: Stretch als 1x1 Rep, A-Skip als 2 Reps)', () => {
  const dosed = (over: Record<string, unknown> = {}) => ({
    exercise_slug: 'doorway_chest_stretch', order_index: 0, notes: '', target_sets: 1,
    target_reps_min: 1, target_reps_max: 1, target_duration_seconds: 0,
    target_distance_meters: 0, target_rest_seconds: 15,
    target_load_type: 'bodyweight', target_load_value: 0, ...over,
  })
  const wrap = (exercises: any[]): any => ({
    blocks: [{ block_type: 'cooldown', order_index: 0, focused_category_slug: 'mobility', exercises }],
  })
  const p = new Map([['cooldown', { slugs: new Set(['doorway_chest_stretch', 'hill_sprint', 'push_up']) }]])
  const mm = { doorway_chest_stretch: 'duration', hill_sprint: 'distance', push_up: 'reps' }

  it('duration-Übung mit Reps statt Sekunden → Verletzung', () => {
    const v = findV2Violations(wrap([dosed()]), p as any, ['cooldown'], [], { measurementBySlug: mm })
    expect(v.join(' ')).toMatch(/doorway_chest_stretch/)
    expect(v.join(' ')).toMatch(/Sekunden|duration/)
  })

  it('duration-Übung mit Sekunden → ok (Reps dürfen zusätzlich stehen)', () => {
    expect(findV2Violations(wrap([dosed({ target_duration_seconds: 45 })]), p as any, ['cooldown'], [], { measurementBySlug: mm })).toEqual([])
  })

  it('distance-Übung ohne Meter → Verletzung; mit Metern ok', () => {
    const noDist = wrap([dosed({ exercise_slug: 'hill_sprint', target_reps_min: 5, target_reps_max: 7 })])
    expect(findV2Violations(noDist, p as any, ['cooldown'], [], { measurementBySlug: mm }).join(' ')).toMatch(/hill_sprint/)
    const withDist = wrap([dosed({ exercise_slug: 'hill_sprint', target_reps_min: 0, target_reps_max: 0, target_distance_meters: 20 })])
    expect(findV2Violations(withDist, p as any, ['cooldown'], [], { measurementBySlug: mm })).toEqual([])
  })

  it('reps-Übung ohne Reps → Verletzung', () => {
    const v = findV2Violations(wrap([dosed({ exercise_slug: 'push_up', target_reps_min: 0, target_reps_max: 0, target_duration_seconds: 30 })]), p as any, ['cooldown'], [], { measurementBySlug: mm })
    expect(v.join(' ')).toMatch(/push_up/)
  })

  it('unbekannter Slug oder reps_or_duration → kein Mess-Typ-Check', () => {
    expect(findV2Violations(wrap([dosed({ exercise_slug: 'push_up' })]), p as any, ['cooldown'], [], { measurementBySlug: { push_up: 'reps_or_duration' } })).toEqual([])
    expect(findV2Violations(wrap([dosed()]), p as any, ['cooldown'], [], { measurementBySlug: {} })).toEqual([])
  })
})

describe('Mess-Typ-Marker in Pool-Zeilen (QA 11.10.)', () => {
  it('markiert duration mit (s), distance mit (m), reps bleibt blank', () => {
    const mm = { stretch_a: 'duration', sprint_b: 'distance', squat_c: 'reps', mixed_d: 'reps_or_duration' }
    expect(withMeasurementMarkers(['stretch_a', 'sprint_b', 'squat_c', 'mixed_d', 'unknown_e'], mm))
      .toBe('stretch_a (s), sprint_b (m), squat_c, mixed_d, unknown_e')
  })
})

describe('Warmup-/Cooldown-Mindestumfang (QA 11.10.: v1-Parität — 2 Übungen vor schwerem Pressen sind zu dünn)', () => {
  const exo = (slug: string, i: number) => ({
    exercise_slug: slug, order_index: i, notes: '', target_sets: 1,
    target_reps_min: 6, target_reps_max: 8, target_duration_seconds: 0,
    target_distance_meters: 0, target_rest_seconds: 15,
    target_load_type: 'bodyweight', target_load_value: 0,
  })
  const s = (warmupSlugs: string[], cooldownSlugs: string[]): any => ({
    blocks: [
      { block_type: 'warmup', order_index: 0, focused_category_slug: 'mobility', exercises: warmupSlugs.map(exo) },
      { block_type: 'cooldown', order_index: 1, focused_category_slug: 'mobility', exercises: cooldownSlugs.map(exo) },
    ],
  })
  const p = new Map([
    ['warmup', { slugs: new Set(['a', 'b', 'c', 'd']) }],
    ['cooldown', { slugs: new Set(['a', 'b', 'c', 'd']) }],
  ])

  it('Warmup unter dem Floor → Verletzung mit Mindestzahl', () => {
    const v = findV2Violations(s(['a', 'b'], ['a', 'b']), p as any, ['warmup', 'cooldown'], [], { minWarmup: 3, minCooldown: 2 })
    expect(v.join(' ')).toMatch(/Warmup/)
    expect(v.join(' ')).toMatch(/3/)
  })

  it('Cooldown unter dem Floor → Verletzung; am Floor ok', () => {
    expect(findV2Violations(s(['a', 'b', 'c'], ['a']), p as any, ['warmup', 'cooldown'], [], { minWarmup: 3, minCooldown: 2 }).join(' ')).toMatch(/Cooldown/)
    expect(findV2Violations(s(['a', 'b', 'c'], ['a', 'b']), p as any, ['warmup', 'cooldown'], [], { minWarmup: 3, minCooldown: 2 })).toEqual([])
  })

  it('ohne Floors kein Check (bisheriges Verhalten)', () => {
    expect(findV2Violations(s(['a'], ['a']), p as any, ['warmup', 'cooldown'])).toEqual([])
  })
})

describe('Block-Obergrenze (QA 11.10., programmatisch statt Prompt-Hoffnung)', () => {
  const exo = (slug: string, i: number) => ({
    exercise_slug: slug, order_index: i, notes: '', target_sets: 3,
    target_reps_min: 5, target_reps_max: 8, target_duration_seconds: 0,
    target_distance_meters: 0, target_rest_seconds: 90,
    target_load_type: 'rpe', target_load_value: 7,
  })
  const s = (bt: string, slugs: string[]): any => ({
    blocks: [{ block_type: bt, order_index: 0, focused_category_slug: 'strength', exercises: slugs.map(exo) }],
  })
  const p = new Map([
    ['core', { slugs: new Set(['a', 'b', 'c']) }],
    ['upper_strength', { slugs: new Set(['a', 'b', 'c', 'd']) }],
    ['warmup', { slugs: new Set(['a', 'b', 'c', 'd', 'e', 'f']) }],
  ])
  const twoPatterns = [
    { block_type: 'upper_strength', pattern: 'push_vertical', emphasis: 'normal', slugs: new Set(['a']) },
    { block_type: 'upper_strength', pattern: 'pull_horizontal', emphasis: 'normal', slugs: new Set(['b']) },
  ] as any

  it('Content-Block ohne Patterns: max 2 Übungen', () => {
    expect(findV2Violations(s('core', ['a', 'b']), p as any, ['core'])).toEqual([])
    expect(findV2Violations(s('core', ['a', 'b', 'c']), p as any, ['core']).join(' ')).toMatch(/core.*höchstens|höchstens.*core/)
  })

  it('Pattern-Block: geforderte Muster + 1 Ergänzung erlaubt', () => {
    expect(findV2Violations(s('upper_strength', ['a', 'b', 'c']), p as any, ['upper_strength'], twoPatterns)).toEqual([])
    expect(findV2Violations(s('upper_strength', ['a', 'b', 'c', 'd']), p as any, ['upper_strength'], twoPatterns).join(' ')).toMatch(/höchstens/)
  })

  it('Warmup/Cooldown sind vom Max ausgenommen', () => {
    expect(findV2Violations(s('warmup', ['a', 'b', 'c', 'd', 'e', 'f']), p as any, ['warmup'])).toEqual([])
  })
})

describe('zeroWarmupCooldownRest', () => {
  const block = (block_type: string, exercises: any[]) => ({ block_type, exercises })

  it('zeroes rest for non-distance exercises in warmup and cooldown', () => {
    const blocks = [
      block('warmup', [
        { target_rest_seconds: 15, target_distance_meters: -1 },
        { target_rest_seconds: 15 },
      ]),
      block('cooldown', [{ target_rest_seconds: 30, target_distance_meters: -1 }]),
    ]
    zeroWarmupCooldownRest(blocks as any)
    expect(blocks[0].exercises.map((e: any) => e.target_rest_seconds)).toEqual([0, 0])
    expect(blocks[1].exercises[0].target_rest_seconds).toBe(0)
  })

  it('keeps rest for distance drills (walk-back is the pause) and other blocks', () => {
    const blocks = [
      block('warmup', [{ target_rest_seconds: 60, target_distance_meters: 30 }]),
      block('lower_strength', [{ target_rest_seconds: 180, target_distance_meters: -1 }]),
    ]
    zeroWarmupCooldownRest(blocks as any)
    expect(blocks[0].exercises[0].target_rest_seconds).toBe(60)
    expect(blocks[1].exercises[0].target_rest_seconds).toBe(180)
  })
})

describe('fixZeroKgLoads (QA 18.10.: Retry-Fallback ließ "0 kg" durch)', () => {
  const block = (block_type: string, exercises: any[]) => ({ block_type, exercises })

  it('schreibt kg <= 0 deterministisch um: Kraft -> RPE 7, Zubehör -> RPE 6, Rahmen -> bodyweight', () => {
    const blocks = [
      block('lower_strength', [{ target_load_type: 'kg', target_load_value: 0 }]),
      block('accessory', [{ target_load_type: 'kg', target_load_value: 0 }]),
      block('core', [{ target_load_type: 'kg', target_load_value: -1 }]),
      block('warmup', [{ target_load_type: 'kg', target_load_value: 0 }]),
    ]
    fixZeroKgLoads(blocks as any)
    expect(blocks[0].exercises[0]).toMatchObject({ target_load_type: 'rpe', target_load_value: 7 })
    expect(blocks[1].exercises[0]).toMatchObject({ target_load_type: 'rpe', target_load_value: 6 })
    expect(blocks[2].exercises[0]).toMatchObject({ target_load_type: 'rpe', target_load_value: 6 })
    expect(blocks[3].exercises[0]).toMatchObject({ target_load_type: 'bodyweight', target_load_value: -1 })
  })

  it('lässt echte Lasten und andere Load-Typen unangetastet', () => {
    const blocks = [
      block('upper_strength', [{ target_load_type: 'kg', target_load_value: 40 }]),
      block('core', [{ target_load_type: 'rpe', target_load_value: 0 }]),
      block('conditioning', [{ target_load_type: 'bodyweight', target_load_value: -1 }]),
    ]
    const before = JSON.parse(JSON.stringify(blocks))
    fixZeroKgLoads(blocks as any)
    expect(blocks).toEqual(before)
  })
})
