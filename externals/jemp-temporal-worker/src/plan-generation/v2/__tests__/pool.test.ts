import { describe, it, expect } from 'vitest'
import { exerciseMatchesBlock, buildBlockPools, strengthPatternPools } from '../pool'
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
    expect(exerciseMatchesBlock(ex({ slug: 'sprint_10m', category_slug: 'lower_body_plyometrics', sprint_type: 'acceleration' }), block('plyo', 'lower'))).toBe(false)
  })
  it('plyo-Variante nach Säule (§1.6): lower=lbp/jumps, upper=ubp', () => {
    expect(exerciseMatchesBlock(ex({ slug: 'box_jump', category_slug: 'lower_body_plyometrics' }), block('plyo', 'lower'))).toBe(true)
    expect(exerciseMatchesBlock(ex({ slug: 'box_jump', category_slug: 'lower_body_plyometrics' }), block('plyo', 'upper'))).toBe(false)
    expect(exerciseMatchesBlock(ex({ slug: 'clap_push_up', category_slug: 'upper_body_plyometrics' }), block('plyo', 'upper'))).toBe(true)
    expect(exerciseMatchesBlock(ex({ slug: 'clap_push_up', category_slug: 'upper_body_plyometrics' }), block('plyo', 'lower'))).toBe(false)
  })
  it('core: Zugehörigkeit via core_type, Verfeinerung via movement_type + is_explosive (§2.3)', () => {
    expect(exerciseMatchesBlock(ex({ slug: 'pallof', core_type: 'stability', movement_type: 'transverse' }), block('core', 'transverse'))).toBe(true)
    expect(exerciseMatchesBlock(ex({ slug: 'plank', core_type: 'stability', movement_type: 'sagittal' }), block('core', 'transverse'))).toBe(false)
    expect(exerciseMatchesBlock(ex({ slug: 'plank', core_type: 'stability', movement_type: 'sagittal' }), block('core', 'sagittal'))).toBe(true)
    expect(exerciseMatchesBlock(ex({ slug: 'box_pushoff', core_type: 'power', movement_type: 'sagittal', is_explosive: true }), block('core', 'explosive'))).toBe(true)
    expect(exerciseMatchesBlock(ex({ slug: 'plank', core_type: 'stability', is_explosive: false }), block('core', 'explosive'))).toBe(false)
    expect(exerciseMatchesBlock(ex({ slug: 'any_core', core_type: 'stability' }), block('core'))).toBe(true) // kein Mix gefordert
    expect(exerciseMatchesBlock(ex({ slug: 'bench', body_region: 'chest' }), block('core'))).toBe(false) // keine Core-Übung
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

describe('buildBlockPools core-Fallback (Review-Fix #1: dünner Varianten-Pool)', () => {
  it('fällt auf den ungefilterten Core-Pool zurück, wenn die Variante <2 Übungen hat', () => {
    const exercises = [
      ex({ slug: 'dead_bug', core_type: 'stability', movement_type: 'sagittal' }),
      ex({ slug: 'plank', core_type: 'stability', movement_type: 'sagittal' }),
      ex({ slug: 'single_chop', core_type: 'power', movement_type: 'transverse' }),
    ]
    const pools = buildBlockPools(exercises as any, [block('core', 'transverse')])
    // nur 1 transverse → Fallback: alle 3 Core-Übungen
    expect(pools.get('core' as any)!.length).toBe(3)
  })
  it('behält die Varianten-Filterung, wenn der Pool groß genug ist', () => {
    const exercises = [
      ex({ slug: 'chop_a', core_type: 'power', movement_type: 'transverse' }),
      ex({ slug: 'chop_b', core_type: 'power', movement_type: 'transverse' }),
      ex({ slug: 'plank', core_type: 'stability', movement_type: 'sagittal' }),
    ]
    const pools = buildBlockPools(exercises as any, [block('core', 'transverse')])
    expect(pools.get('core' as any)!.map((e: any) => e.slug).sort()).toEqual(['chop_a', 'chop_b'])
  })
})

describe('warmup/cooldown region matching (09.10.: v1-Regression behoben)', () => {
    const mobility = (slug: string, region: string | null, tags: string[] = ['warmup', 'cooldown'], dominant: string | null = null) =>
        ex({ slug, category_slug: 'mobility', body_region: region, dominant_region: dominant, intensity_score: 2, legacy_block_slugs: tags });

    const catalog = [
        mobility('hip_90_90', 'hip'),
        mobility('hamstring_sweep', 'hamstring'),
        mobility('ankle_rocker', 'ankle'),
        mobility('shoulder_dislocate', 'shoulder'),
        mobility('thoracic_opener', 'thoracic'),
        mobility('box_breathing', 'full_body', ['cooldown']),
    ];

    it('Beintag: Warmup-Pool enthält Hüfte/Hamstring/Ankle, nicht Schulter/Thorax', () => {
        const pools = buildBlockPools(catalog as any, [block('warmup'), block('lower_body'), block('cooldown')]);
        const warmup = pools.get('warmup' as any)!.map((e: any) => e.slug);
        expect(warmup).toEqual(expect.arrayContaining(['hip_90_90', 'hamstring_sweep', 'ankle_rocker']));
        expect(warmup).not.toContain('shoulder_dislocate');
        expect(warmup).not.toContain('thoracic_opener');
    });

    it('Push-Tag: Cooldown-Pool dehnt Schulter/Thorax, nicht Hamstring', () => {
        const pools = buildBlockPools(catalog as any, [block('warmup'), block('push'), block('cooldown')]);
        const cooldown = pools.get('cooldown' as any)!.map((e: any) => e.slug);
        expect(cooldown).toEqual(expect.arrayContaining(['shoulder_dislocate', 'thoracic_opener']));
        expect(cooldown).not.toContain('hamstring_sweep');
    });

    it('full_body ohne dominant_region passt immer (Breathing bleibt im Cooldown)', () => {
        const pools = buildBlockPools(catalog as any, [block('warmup'), block('push'), block('cooldown')]);
        expect(pools.get('cooldown' as any)!.map((e: any) => e.slug)).toContain('box_breathing');
    });

    it('Fallback: unter 2 regionalen Treffern bleibt der volle Pool', () => {
        const thin = [mobility('shoulder_dislocate', 'shoulder'), mobility('thoracic_opener', 'thoracic'), mobility('neck_roll', 'neck')];
        const pools = buildBlockPools(thin as any, [block('warmup'), block('lower_body'), block('cooldown')]);
        expect(pools.get('warmup' as any)!.length).toBe(3);
    });
});

describe('speed framing exercises stay out of workout warmups (09.10.)', () => {
    it('easy_jog und build_up_run erscheinen nie im Workout-Warmup-Pool', () => {
        const catalog = [
            ex({ slug: 'easy_jog', category_slug: 'sprints', sprint_type: null, intensity_score: 2, legacy_block_slugs: ['warmup', 'cooldown'] }),
            ex({ slug: 'build_up_run', category_slug: 'sprints', sprint_type: null, intensity_score: 5, legacy_block_slugs: ['warmup'] }),
            ex({ slug: 'ministep_drill', category_slug: 'sprints', sprint_type: null, intensity_score: 2, legacy_block_slugs: ['warmup'] }),
            ex({ slug: 'hip_90_90', category_slug: 'mobility', body_region: 'hip', intensity_score: 2, legacy_block_slugs: ['warmup'] }),
        ];
        const pools = buildBlockPools(catalog as any, [block('warmup'), block('lower_body'), block('cooldown')]);
        const warmup = pools.get('warmup' as any)!.map((e: any) => e.slug);
        expect(warmup).not.toContain('easy_jog');
        expect(warmup).not.toContain('build_up_run');
        expect(warmup).toContain('ministep_drill');
    });
});

describe('exercise_regions treibt das Region-Matching (10.10.)', () => {
    const warmupMob = (slug: string, over: any = {}) =>
        ex({ slug, category_slug: 'mobility', intensity_score: 2, legacy_block_slugs: ['warmup'], ...over });
    const lowerDay = [block('warmup'), block('lower_body'), block('cooldown')];

    it('secondary-Region zählt: Übung mit primary shoulder + secondary hamstring matcht den Beintag', () => {
        const catalog = [
            warmupMob('shoulder_to_ham', { body_region: 'shoulder', regions: [{ region: 'shoulder', role: 'primary' }, { region: 'hamstring', role: 'secondary' }] }),
            warmupMob('hip_a', { body_region: 'hip', regions: [{ region: 'hip', role: 'primary' }] }),
            warmupMob('hip_b', { body_region: 'hip', regions: [{ region: 'hip', role: 'primary' }] }),
        ];
        const warmup = buildBlockPools(catalog as any, lowerDay).get('warmup' as any)!.map((e: any) => e.slug);
        expect(warmup).toContain('shoulder_to_ham');
    });

    it('regions hat Vorrang vor den alten Spalten', () => {
        const catalog = [
            // Spalte sagt hip (würde matchen), regions sagt nur shoulder → raus
            warmupMob('stale_column', { body_region: 'hip', regions: [{ region: 'shoulder', role: 'primary' }] }),
            warmupMob('hip_a', { body_region: 'hip', regions: [{ region: 'hip', role: 'primary' }] }),
            warmupMob('hip_b', { body_region: 'hip', regions: [{ region: 'hip', role: 'primary' }] }),
        ];
        const warmup = buildBlockPools(catalog as any, lowerDay).get('warmup' as any)!.map((e: any) => e.slug);
        expect(warmup).not.toContain('stale_column');
    });

    it('full_body-Row matcht immer; ohne regions-Daten gilt der Spalten-Fallback', () => {
        const catalog = [
            warmupMob('universal', { body_region: 'full_body', regions: [{ region: 'full_body', role: 'primary' }] }),
            warmupMob('legacy_only', { body_region: 'hamstring', regions: null }),
            warmupMob('hip_a', { body_region: 'hip', regions: [{ region: 'hip', role: 'primary' }] }),
        ];
        const warmup = buildBlockPools(catalog as any, lowerDay).get('warmup' as any)!.map((e: any) => e.slug);
        expect(warmup).toContain('universal');
        expect(warmup).toContain('legacy_only');
    });
});

describe('upper/lower_strength Pools (Spec 2026-10-10)', () => {
    const upperBlock = { block_type: 'upper_strength', variant: null, emphasis: 'heavy', patterns: [
        { pattern: 'push_vertical', emphasis: 'heavy' }, { pattern: 'pull_horizontal', emphasis: 'normal' },
    ] } as any;
    it('matcht Übungen jedes geforderten Patterns, andere nicht', () => {
        expect(exerciseMatchesBlock(ex({ slug: 'ohp', strength_pattern: 'push_vertical' }), upperBlock)).toBe(true);
        expect(exerciseMatchesBlock(ex({ slug: 'row', strength_pattern: 'pull_horizontal' }), upperBlock)).toBe(true);
        expect(exerciseMatchesBlock(ex({ slug: 'bench', strength_pattern: 'push_horizontal' }), upperBlock)).toBe(false);
        expect(exerciseMatchesBlock(ex({ slug: 'squat', strength_pattern: 'knee_dominant' }), upperBlock)).toBe(false);
    });
    it('Coarse-Fallback greift pro Pattern (chest → push), Isolations-Leck bleibt dicht', () => {
        expect(exerciseMatchesBlock(ex({ slug: 'machine_press', body_region: 'chest' }), upperBlock)).toBe(true);
        expect(exerciseMatchesBlock(ex({ slug: 'lateral_raise', body_region: 'shoulder' }), upperBlock)).toBe(false);
    });
    it('lower_strength matcht nach Pattern-Anforderung inkl. Fallback', () => {
        const lowerBlock = { block_type: 'lower_strength', variant: null, emphasis: 'heavy', patterns: [{ pattern: 'hinge', emphasis: 'heavy' }] } as any;
        expect(exerciseMatchesBlock(ex({ slug: 'rdl', strength_pattern: 'hinge' }), lowerBlock)).toBe(true);
        expect(exerciseMatchesBlock(ex({ slug: 'back_squat', strength_pattern: 'knee_dominant' }), lowerBlock)).toBe(false);
        expect(exerciseMatchesBlock(ex({ slug: 'hip_thrust_machine', body_region: 'glute' }), lowerBlock)).toBe(true);
    });
    it('strengthPatternPools liefert einen Pool je Pattern', () => {
        const pools = strengthPatternPools([
            ex({ slug: 'ohp', strength_pattern: 'push_vertical' }),
            ex({ slug: 'row', strength_pattern: 'pull_horizontal' }),
        ] as any, upperBlock.patterns);
        expect(pools.get('push_vertical')!.map((e: any) => e.slug)).toEqual(['ohp']);
        expect(pools.get('pull_horizontal')!.map((e: any) => e.slug)).toEqual(['row']);
    });
    it('Warmup-Region-Matching: lower_strength zieht Hüfte, upper_strength Schulter+Rücken', () => {
        const catalog = [
            ex({ slug: 'hip_90_90', category_slug: 'mobility', body_region: 'hip', intensity_score: 2, legacy_block_slugs: ['warmup'] }),
            ex({ slug: 'shoulder_opener', category_slug: 'mobility', body_region: 'shoulder', intensity_score: 2, legacy_block_slugs: ['warmup'] }),
            ex({ slug: 'upper_back_roll', category_slug: 'mobility', body_region: 'upper_back', intensity_score: 2, legacy_block_slugs: ['warmup'] }),
        ];
        const pools = buildBlockPools(catalog as any, [block('warmup'), upperBlock, block('cooldown')]);
        const warmup = pools.get('warmup' as any)!.map((e: any) => e.slug);
        expect(warmup).toEqual(expect.arrayContaining(['shoulder_opener', 'upper_back_roll']));
        expect(warmup).not.toContain('hip_90_90');
    });
});
