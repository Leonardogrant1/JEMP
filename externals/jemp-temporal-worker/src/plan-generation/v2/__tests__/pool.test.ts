import { describe, it, expect } from 'vitest'
import { exerciseMatchesBlock, buildBlockPools } from '../pool'
import { ex, block } from './fixtures'

describe('exerciseMatchesBlock', () => {
  it('matches tagged exercises by exact variant', () => {
    expect(exerciseMatchesBlock(ex({ slug: 'bench_press', strength_pattern: 'push_horizontal' }), block('push', 'push_horizontal'))).toBe(true)
    expect(exerciseMatchesBlock(ex({ slug: 'bench_press', strength_pattern: 'push_horizontal' }), block('push', 'push_vertical'))).toBe(false)
  })
  it('falls back to body region for untagged exercises', () => {
    expect(exerciseMatchesBlock(ex({ slug: 'machine_press', body_region: 'chest' }), block('push', 'push_vertical'))).toBe(true)
  })
  it('keeps sprints out of plyo pools', () => {
    expect(exerciseMatchesBlock(ex({ slug: 'sprint_10m', category_slug: 'lower_body_plyometrics', sprint_type: 'acceleration' }), block('plyo', 'maximal'))).toBe(false)
  })
  it('matches core by core_type and rotation only by tag', () => {
    expect(exerciseMatchesBlock(ex({ slug: 'copenhagen_plank', core_type: 'stability' }), block('core', 'stability'))).toBe(true)
    expect(exerciseMatchesBlock(ex({ slug: 'machine_press', body_region: 'chest' }), block('rotation'))).toBe(false)
  })
  it('matches lower_body variants with coarse fallback', () => {
    expect(exerciseMatchesBlock(ex({ slug: 'back_squat', strength_pattern: 'knee_dominant' }), block('lower_body', 'knee_dominant'))).toBe(true)
    expect(exerciseMatchesBlock(ex({ slug: 'leg_press', body_region: 'quad' }), block('lower_body', 'knee_dominant'))).toBe(true)
    expect(exerciseMatchesBlock(ex({ slug: 'leg_press', body_region: 'quad' }), block('lower_body', 'hinge'))).toBe(false)
  })
  it('matches accessory small-muscle regions and warmup mobility', () => {
    expect(exerciseMatchesBlock(ex({ slug: 'banded_clamshell', body_region: 'hip' }), block('accessory'))).toBe(true)
    expect(exerciseMatchesBlock(ex({ slug: 'hip_cars', category_slug: 'mobility' }), block('warmup'))).toBe(true)
    expect(exerciseMatchesBlock(ex({ slug: 'hip_cars', category_slug: 'mobility' }), block('cooldown'))).toBe(true)
  })
})

describe('buildBlockPools', () => {
  it('builds one pool per planned block', () => {
    const pools = buildBlockPools(
      [ex({ slug: 'bench_press', strength_pattern: 'push_horizontal' }), ex({ slug: 'romanian_deadlift', strength_pattern: 'hinge' })],
      [block('push', 'push_horizontal'), block('lower_body', 'hinge')],
    )
    expect(pools.get('push')!.map((e: any) => e.slug)).toEqual(['bench_press'])
    expect(pools.get('lower_body')!.map((e: any) => e.slug)).toEqual(['romanian_deadlift'])
  })
})
