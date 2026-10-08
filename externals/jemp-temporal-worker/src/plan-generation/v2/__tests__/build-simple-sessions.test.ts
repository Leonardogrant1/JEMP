import { describe, it, expect } from 'vitest'
import { buildMobilitySession, buildConditioningSession, buildConditioningFinisherBlock } from '../build-simple-sessions'
import { ex, day } from './fixtures'

describe('buildMobilitySession', () => {
  const pool = ['hip_cars', 'shoulder_cars', 'ankle_cars', 'childs_pose', 'supine_twist']
    .map((slug) => ex({ slug, category_slug: 'mobility', measurement_type: 'duration' }))
  it('builds one mobility block with duration prescriptions', () => {
    const r = buildMobilitySession({ day: day({ session_type: 'mobility', minutes: 20 }), exercises: pool, orderIndex: 0 })!
    expect(r.session.session_type).toBe('mobility')
    const blockOut = r.session.blocks.find((b: any) => b.block_type === 'mobility')!
    expect(blockOut.exercises.length).toBeGreaterThanOrEqual(5)
    expect(blockOut.exercises.every((e: any) => e.target_duration_seconds > 0)).toBe(true)
  })
  it('returns null below 3 pool exercises', () => {
    expect(buildMobilitySession({ day: day(), exercises: pool.slice(0, 2), orderIndex: 0 })).toBeNull()
  })
})

describe('buildConditioningSession', () => {
  const pool = ['burpee', 'jumping_jacks', 'jump_rope_standard', 'bear_crawl']
    .map((slug) => ex({ slug, category_slug: 'lower_body_plyometrics', measurement_type: 'reps_or_duration', intensity_score: 4 }))
  it('prescribes the interval format on every exercise', () => {
    const r = buildConditioningSession({ day: day({ session_type: 'conditioning', minutes: 30 }), exercises: pool, orderIndex: 0 })!
    const blockOut = r.session.blocks.find((b: any) => b.block_type === 'conditioning')!
    expect(blockOut.exercises.every((e: any) => e.target_rounds > 0 && e.target_duration_seconds > 0 && e.target_rest_seconds >= 0)).toBe(true)
  })
  it('picks the circuit format when enough intense exercises exist', () => {
    const intense = pool.map((p, i) => ({ ...p, intensity_score: 6, slug: p.slug + '_i' + i }))
    const r = buildConditioningSession({ day: day(), exercises: intense, orderIndex: 0 })!
    const blockOut = r.session.blocks.find((b: any) => b.block_type === 'conditioning')!
    expect(blockOut.exercises[0].target_duration_seconds).toBe(40) // circuit_40_20
  })
  it('returns null and a note when the pool is empty', () => {
    const r = buildConditioningSession({ day: day(), exercises: [ex({ slug: 'bench_press', category_slug: 'strength' })], orderIndex: 0 })
    expect(r).toBeNull()
  })
})

describe('buildConditioningFinisherBlock', () => {
  it('builds a compact interval block before the cooldown', () => {
    const block = buildConditioningFinisherBlock(['burpee', 'jump_rope_standard', 'bear_crawl'], 7)!
    expect(block.block_type).toBe('conditioning')
    expect(block.order_index).toBe(7)
    expect(block.exercises.length).toBeLessThanOrEqual(3)
    expect(block.exercises.every((e: any) => e.target_rounds > 0 && e.target_duration_seconds === 30)).toBe(true)
  })
  it('returns null below 2 slugs', () => {
    expect(buildConditioningFinisherBlock(['burpee'], 7)).toBeNull()
  })
})
