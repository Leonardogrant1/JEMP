import { describe, it, expect } from 'vitest'
import { buildSpeedSession } from '../build-speed-session'
import { ex, day } from './fixtures'

const basePool = [
  ex({ slug: 'sprint_10m', sprint_type: 'acceleration', category_slug: 'sprints', measurement_type: 'time' }),
  ex({ slug: 'flying_20_sprint', sprint_type: 'max_velocity', category_slug: 'sprints', measurement_type: 'time' }),
  ex({ slug: 'agility_505', category_slug: 'cod', measurement_type: 'time' }),
  ex({ slug: 't_drill', category_slug: 'cod', measurement_type: 'time' }),
  ex({ slug: 'hip_cars', category_slug: 'mobility', measurement_type: 'duration' }),
]

describe('buildSpeedSession', () => {
  it('builds the warmup→sprint→cod→cooldown structure', () => {
    const r = buildSpeedSession({ day: day(), exercises: basePool, levels: { sprints: 2, cod: 2 }, allowMaxVelocity: true, orderIndex: 0 })!
    expect(r.session.session_type).toBe('speed')
    expect(r.session.blocks.map((b: any) => b.block_type)).toEqual(['warmup', 'sprint', 'cod', 'cooldown'])
  })
  it('excludes max_velocity without the gate', () => {
    const r = buildSpeedSession({ day: day(), exercises: basePool, levels: { sprints: 3, cod: 1 }, allowMaxVelocity: false, orderIndex: 0 })!
    const slugs = r.session.blocks.flatMap((b: any) => b.exercises.map((e: any) => e.exercise_slug))
    expect(slugs).not.toContain('flying_20_sprint')
  })
  it('maintenance dose caps sprint sets', () => {
    const r = buildSpeedSession({ day: day({ dose: 'maintenance' }), exercises: basePool, levels: { sprints: 2, cod: 1 }, allowMaxVelocity: true, orderIndex: 0 })!
    const sprintBlock = r.session.blocks.find((b: any) => b.block_type === 'sprint')!
    expect(Math.max(...sprintBlock.exercises.map((e: any) => e.target_sets))).toBeLessThanOrEqual(3)
  })
  it('cod-dominant levels yield more cod than sprint exercises', () => {
    const r = buildSpeedSession({ day: day(), exercises: basePool, levels: { sprints: 1, cod: 3 }, allowMaxVelocity: true, orderIndex: 0 })!
    const count = (bt: string) => r.session.blocks.find((b: any) => b.block_type === bt)!.exercises.length
    expect(count('cod')).toBeGreaterThan(count('sprint'))
  })
  it('returns null and a note when sprint and cod pools are empty', () => {
    const r = buildSpeedSession({ day: day(), exercises: [ex({ slug: 'hip_cars', category_slug: 'mobility' })], levels: { sprints: 2, cod: 2 }, allowMaxVelocity: true, orderIndex: 0 })
    expect(r).toBeNull()
  })
})

describe('speed session warmup drills (QA 08.10.: A-Skip = Sprint-Warmup)', () => {
    it('nimmt Technik-Drills (sprints-Kategorie, kein sprint_type, leicht) ins Warmup', () => {
        const pool = [
            ...basePool,
            ex({ slug: 'a_skip_drill', category_slug: 'sprints', sprint_type: null, intensity_score: 1, measurement_type: 'duration' }),
        ];
        const r = buildSpeedSession({ day: day(), exercises: pool, levels: { sprints: 2, cod: 1 }, allowMaxVelocity: true, orderIndex: 0 })!;
        const warmupSlugs = r.session.blocks.find((b: any) => b.block_type === 'warmup')!.exercises.map((e: any) => e.exercise_slug);
        expect(warmupSlugs).toContain('a_skip_drill');
    });
});
