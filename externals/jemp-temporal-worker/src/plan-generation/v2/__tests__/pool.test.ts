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
  it('rotation nimmt Rotations-Pattern UND Core-Übungen (Core-Merge QA 09.10.)', () => {
    expect(exerciseMatchesBlock(ex({ slug: 'pallof_press', strength_pattern: 'rotation' }), block('rotation'))).toBe(true)
    expect(exerciseMatchesBlock(ex({ slug: 'copenhagen_plank', core_type: 'stability' }), block('rotation'))).toBe(true)
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

describe('warmup CNS micro-dose pool (QA-Befund 08.10.)', () => {
    it('lässt Sprint-Technik-Drills (Kategorie sprints, kein sprint_type) ins Warmup', () => {
        expect(exerciseMatchesBlock(ex({ slug: 'high_knees', category_slug: 'sprints', intensity_score: 1, sprint_type: null }), block('warmup'))).toBe(true);
    });
    it('hält echte Sprints und intensive Drills draußen', () => {
        expect(exerciseMatchesBlock(ex({ slug: 'sprint_10m', category_slug: 'sprints', sprint_type: 'acceleration', intensity_score: 1 }), block('warmup'))).toBe(false);
        expect(exerciseMatchesBlock(ex({ slug: 'b_skip_drill', category_slug: 'sprints', intensity_score: 5, sprint_type: null }), block('warmup'))).toBe(false);
    });
});

describe('mobility warmup/cooldown nach Legacy-Block-Tag (QA 09.10. — Box Breathing)', () => {
    it('cooldown-only Übung (Atemübung) matcht cooldown, nicht warmup', () => {
        const breathing = ex({ slug: 'box_breathing', category_slug: 'mobility', legacy_block_slugs: ['cooldown'] });
        expect(exerciseMatchesBlock(breathing, block('warmup'))).toBe(false);
        expect(exerciseMatchesBlock(breathing, block('cooldown'))).toBe(true);
    });
    it('warmup-only Drill matcht warmup, nicht cooldown', () => {
        const drill = ex({ slug: 'arm_circle', category_slug: 'mobility', legacy_block_slugs: ['warmup'] });
        expect(exerciseMatchesBlock(drill, block('warmup'))).toBe(true);
        expect(exerciseMatchesBlock(drill, block('cooldown'))).toBe(false);
    });
    it('Übung mit beiden Tags matcht beide Blöcke', () => {
        const both = ex({ slug: 'cat_cow_stretch', category_slug: 'mobility', legacy_block_slugs: ['cooldown', 'warmup'] });
        expect(exerciseMatchesBlock(both, block('warmup'))).toBe(true);
        expect(exerciseMatchesBlock(both, block('cooldown'))).toBe(true);
    });
    it('ohne Tag-Info: beide erlaubt (Fallback, bisheriges Verhalten)', () => {
        const untagged = ex({ slug: 'x', category_slug: 'mobility', legacy_block_slugs: null });
        expect(exerciseMatchesBlock(untagged, block('warmup'))).toBe(true);
        expect(exerciseMatchesBlock(untagged, block('cooldown'))).toBe(true);
    });
});

describe('Isolations-Leck im Push/Pull-Fallback (QA 09.10.)', () => {
    it('Seitheben (shoulder, kein Pattern) matcht optional — nicht push', () => {
        const raise = ex({ slug: 'dumbbell_lateral_raise', body_region: 'shoulder' });
        expect(exerciseMatchesBlock(raise, block('optional'))).toBe(true);
        expect(exerciseMatchesBlock(raise, block('push', 'push_vertical'))).toBe(false);
    });
    it('pattern-lose Arm-Isolation verschmutzt Push/Pull-Fallback nicht', () => {
        expect(exerciseMatchesBlock(ex({ slug: 'tricep_pushdown', body_region: 'tricep' }), block('push', 'push_vertical'))).toBe(false);
        expect(exerciseMatchesBlock(ex({ slug: 'dumbbell_curl', body_region: 'bicep' }), block('pull', 'pull_vertical'))).toBe(false);
    });
    it('untagged Brust-Compound behält den Push-Fallback', () => {
        expect(exerciseMatchesBlock(ex({ slug: 'machine_press', body_region: 'chest' }), block('push', 'push_vertical'))).toBe(true);
    });
});

describe('optional block (User-Plan: Arme raus aus Accessory)', () => {
    it('Arm-Isolation matcht optional, nicht mehr accessory', () => {
        const curl = ex({ slug: 'dumbbell_biceps_curl', body_region: 'bicep' });
        expect(exerciseMatchesBlock(curl, block('optional'))).toBe(true);
        expect(exerciseMatchesBlock(curl, block('accessory'))).toBe(false);
    });
    it('funktionelle kleine Muskeln bleiben accessory, nie optional', () => {
        const cope = ex({ slug: 'copenhagen_hip_adduction', body_region: 'groin' });
        expect(exerciseMatchesBlock(cope, block('accessory'))).toBe(true);
        expect(exerciseMatchesBlock(cope, block('optional'))).toBe(false);
    });
});
