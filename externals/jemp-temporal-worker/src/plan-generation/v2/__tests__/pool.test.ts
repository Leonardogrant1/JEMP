import { describe, it, expect } from 'vitest'
import { exerciseMatchesBlock, buildBlockPools, strengthPatternPools, rotatedPoolWindow, rotateSlugs, patternSlugWindow, pickPlanePin, isCnsMicroDoseExercise, type V2Exercise } from '../pool'
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

describe('rotatedPoolWindow — Füller-Rotation (QA 10.10.)', () => {
  const mk = (slug: string, region: string) => ex({ slug, category_slug: 'strength', body_region: region })
  const pool = [
    mk('hip_a', 'hip'), mk('hip_b', 'hip'),
    mk('calf_a', 'calf'), mk('calf_b', 'calf'),
    mk('groin_a', 'groin'), mk('groin_b', 'groin'),
    mk('ankle_a', 'ankle'), mk('ankle_b', 'ankle'),
  ]
  it('liefert ein Fenster von 4 und rotiert mit dem Offset', () => {
    const w0 = rotatedPoolWindow(pool, 0, 4).map((e) => e.slug)
    const w1 = rotatedPoolWindow(pool, 1, 4).map((e) => e.slug)
    expect(w0).toHaveLength(4)
    expect(w0).not.toEqual(w1)
  })
  it('balanciert Regionen: jedes 4er-Fenster deckt 4 verschiedene Regionen', () => {
    for (const offset of [0, 1, 2, 3, 5, 7]) {
      const regions = rotatedPoolWindow(pool, offset, 4).map((e) => e.body_region)
      expect(new Set(regions).size).toBe(4)
    }
  })
  it('balanciert auch bei ungleich großen Gruppen (realer Pool: 3/5/2/6)', () => {
    const uneven = [
      mk('a1', 'ankle'), mk('a2', 'ankle'), mk('a3', 'ankle'),
      mk('c1', 'calf'), mk('c2', 'calf'), mk('c3', 'calf'), mk('c4', 'calf'), mk('c5', 'calf'),
      mk('g1', 'groin'), mk('g2', 'groin'),
      mk('h1', 'hip'), mk('h2', 'hip'), mk('h3', 'hip'), mk('h4', 'hip'), mk('h5', 'hip'), mk('h6', 'hip'),
    ]
    for (const offset of [0, 3, 5, 9, 11, 14]) {
      const w = rotatedPoolWindow(uneven, offset, 4)
      expect(new Set(w.map((e) => e.body_region)).size).toBe(4)
      expect(new Set(w.map((e) => e.slug)).size).toBe(4)
    }
  })
  it('deterministisch: gleicher Offset → gleiches Fenster', () => {
    expect(rotatedPoolWindow(pool, 3, 4)).toEqual(rotatedPoolWindow(pool, 3, 4))
  })
  it('Pool ≤ Fenstergröße → kompletter Pool, keine Duplikate', () => {
    const small = pool.slice(0, 3)
    const w = rotatedPoolWindow(small, 5, 4).map((e) => e.slug)
    expect(w).toHaveLength(3)
    expect(new Set(w).size).toBe(3)
  })
  it('Wrap erzeugt keine Duplikate', () => {
    const w = rotatedPoolWindow(pool, 7, 4).map((e) => e.slug)
    expect(new Set(w).size).toBe(4)
  })
})

describe('rotateSlugs — Prompt-Reihenfolge rotiert pro Generation (QA 10.10.)', () => {
  it('sortiert stabil und rotiert den Startpunkt mit dem Offset', () => {
    expect(rotateSlugs(['c', 'a', 'b', 'd'], 0)).toEqual(['a', 'b', 'c', 'd'])
    expect(rotateSlugs(['c', 'a', 'b', 'd'], 2)).toEqual(['c', 'd', 'a', 'b'])
    expect(rotateSlugs(['c', 'a', 'b', 'd'], 6)).toEqual(['c', 'd', 'a', 'b']) // Wrap
  })
  it('gleiche Menge, nur andere Reihenfolge — Validator-Sets bleiben identisch', () => {
    const r = rotateSlugs(['x', 'y', 'z'], 1)
    expect(new Set(r)).toEqual(new Set(['x', 'y', 'z']))
    expect(r).toHaveLength(3)
  })
})

describe('rotatedPoolWindow mit groupBy movement_type (Plyo, QA 10.10.)', () => {
  const plyo = (slug: string, movement_type: string) => ex({ slug, category_slug: 'upper_body_plyometrics', movement_type })
  const pool = [
    plyo('clap_push_up', 'sagittal'), plyo('med_ball_chest_pass', 'sagittal'),
    plyo('med_ball_overhead_throw', 'sagittal'), plyo('medicine_ball_slam', 'sagittal'),
    plyo('depth_push_up', 'sagittal'), plyo('explosive_cable_press', 'sagittal'),
    plyo('explosive_cable_row', 'sagittal'), plyo('kneeling_plyo_push_up', 'sagittal'),
    plyo('rotational_med_ball_slam', 'transverse'), plyo('rotational_med_ball_throw', 'transverse'),
    plyo('landmine_punch_throw', 'transverse'),
  ]
  it('jedes 6er-Fenster enthält mindestens eine transverse Übung', () => {
    for (const offset of [0, 1, 3, 5, 8, 10, 13]) {
      const w = rotatedPoolWindow(pool, offset, 6, (e) => e.movement_type)
      expect(w).toHaveLength(6)
      expect(w.some((e) => e.movement_type === 'transverse')).toBe(true)
      expect(new Set(w.map((e) => e.slug)).size).toBe(6)
    }
  })
  it('rotiert mit dem Offset', () => {
    const w0 = rotatedPoolWindow(pool, 0, 6, (e) => e.movement_type).map((e) => e.slug)
    const w1 = rotatedPoolWindow(pool, 1, 6, (e) => e.movement_type).map((e) => e.slug)
    expect(w0).not.toEqual(w1)
  })
})

describe('plyo-Pool Intensitäts-Floor (QA 10.10. — Leg Swings sind kein Plyo)', () => {
  it('Intensität < 3 fliegt aus dem Plyo-Pool, echte Plyos bleiben', () => {
    const swing = ex({ slug: 'leg_swing_side_to_side', category_slug: 'lower_body_plyometrics', intensity_score: 2 })
    const jump = ex({ slug: 'box_jump', category_slug: 'lower_body_plyometrics', intensity_score: 6 })
    expect(exerciseMatchesBlock(swing, block('plyo', 'lower'))).toBe(false)
    expect(exerciseMatchesBlock(jump, block('plyo', 'lower'))).toBe(true)
  })
})

describe('Sport-Präferenz in Fenster & Pattern-Pools (QA 10.10.)', () => {
  const plyo = (slug: string, movement_type: string, preferred = false) =>
    ex({ slug, category_slug: 'upper_body_plyometrics', movement_type, preferred })
  const pool = [
    plyo('clap_push_up', 'sagittal'), plyo('med_ball_chest_pass', 'sagittal'),
    plyo('med_ball_overhead_throw', 'sagittal'), plyo('medicine_ball_slam', 'sagittal'),
    plyo('depth_push_up', 'sagittal'), plyo('explosive_cable_press', 'sagittal'),
    plyo('kneeling_plyo_push_up', 'sagittal'), plyo('incline_plyo_push_up', 'sagittal'),
    plyo('landmine_punch_throw', 'transverse', true),
    plyo('rotational_med_ball_slam', 'transverse', true),
  ]
  it('bevorzugte Übungen sind in JEDEM Fenster, egal welcher Offset', () => {
    for (const offset of [0, 1, 4, 7, 9, 12]) {
      const slugs = rotatedPoolWindow(pool, offset, 6, (e) => e.movement_type).map((e) => e.slug)
      expect(slugs).toContain('landmine_punch_throw')
      expect(slugs).toContain('rotational_med_ball_slam')
      expect(new Set(slugs).size).toBe(6)
    }
  })

  const strength = (slug: string, preferred = false) => ex({ slug, strength_pattern: 'push_vertical', preferred })
  const pvPool = [
    strength('push_press'), strength('overhead_press'), strength('dips'),
    strength('weighted_dip'), strength('pike_push_up'), strength('dumbbell_shoulder_press'),
    strength('landmine_press', true),
  ]
  it('patternSlugWindow: heavy = voller Pool mit Präferenz vorn', () => {
    const slugs = patternSlugWindow(pvPool, 'heavy', 3)
    expect(slugs).toHaveLength(7)
    expect(slugs[0]).toBe('landmine_press')
  })
  it('patternSlugWindow: normal = 4er-Fenster, Präferenz immer enthalten, rotiert', () => {
    const w0 = patternSlugWindow(pvPool, 'normal', 0)
    const w2 = patternSlugWindow(pvPool, 'normal', 2)
    expect(w0).toHaveLength(4)
    expect(w0[0]).toBe('landmine_press')
    expect(w2[0]).toBe('landmine_press')
    expect(w0).not.toEqual(w2)
  })
})

describe('pickPlanePin + patternSlugWindow planePin (Spec 2026-10-11 §4.2)', () => {
  const pl = (slug: string, movement_type: string, preferred = false): V2Exercise => ({
    id: slug, slug, name: slug, category_slug: 'strength',
    body_region: 'quad', dominant_region: null, strength_pattern: 'knee_dominant',
    plyo_type: null, core_type: null, sprint_type: null, covered_patterns: null,
    laterality: 'bilateral', min_level: 1, max_level: 100, intensity_score: 5,
    measurement_type: 'reps', legacy_block_slugs: null, movement_type,
    is_explosive: false, regions: null, preferred,
  })
  const pool = [
    pl('back_squat', 'sagittal'), pl('front_squat', 'sagittal'),
    pl('split_squat', 'sagittal'), pl('reverse_lunge', 'sagittal'),
    pl('lateral_lunge', 'frontal'), pl('kb_split_squat_rotation', 'transverse'),
  ]

  it('pickPlanePin findet die Ziel-Ebene, rotiert mit offset', () => {
    expect(pickPlanePin(pool, 'frontal', 0)).toBe('lateral_lunge')
    expect(pickPlanePin(pool, 'transverse', 0)).toBe('kb_split_squat_rotation')
  })

  it('pickPlanePin: Ziel-Ebene leer → Fallback andere nicht-sagittale, sonst null', () => {
    const noFrontal = pool.filter((e) => e.movement_type !== 'frontal')
    expect(pickPlanePin(noFrontal, 'frontal', 0)).toBe('kb_split_squat_rotation')
    const onlySagittal = pool.filter((e) => e.movement_type === 'sagittal')
    expect(pickPlanePin(onlySagittal, 'frontal', 0)).toBeNull()
  })

  it('planePin steht vorn im normal-Fenster und verdoppelt sich nicht (Review Focus 3)', () => {
    const win = patternSlugWindow(pool, 'normal', 0, 'kb_split_squat_rotation')
    expect(win[0]).toBe('kb_split_squat_rotation')
    expect(win).toHaveLength(4)
    expect(win.filter((s) => s === 'kb_split_squat_rotation')).toHaveLength(1)
  })

  it('planePin ersetzt den letzten preferred-Pin — Fenstergröße wächst nicht (Spec §4.2)', () => {
    const withPref = pool.map((e) => ['back_squat', 'front_squat'].includes(e.slug) ? { ...e, preferred: true } : e)
    const before = patternSlugWindow(withPref, 'normal', 0)
    const after = patternSlugWindow(withPref, 'normal', 0, 'lateral_lunge')
    expect(after).toHaveLength(before.length)
    expect(after[0]).toBe('lateral_lunge')
    expect(after).toContain('back_squat')        // erster preferred-Pin bleibt
    expect(after).not.toContain('front_squat')   // letzter preferred-Pin weicht aus dem Fenster
  })

  it('ersetzter preferred-Pin ist nicht aus dem Gesamtpool gelöscht (Review Focus 5)', () => {
    const withPref = pool.map((e) => ['back_squat', 'front_squat'].includes(e.slug) ? { ...e, preferred: true } : e)
    const heavy = patternSlugWindow(withPref, 'heavy', 0, 'lateral_lunge')
    expect(heavy).toContain('front_squat')       // heavy ohne Pin-Ersetzung, Präferenz bleibt
    // Heavy-Filter (QA 11.10.): nur die 4 sagittalen Int-5-Übungen bleiben.
    expect(heavy).toHaveLength(4)
  })

  it('Ebenen-Übung, die selbst preferred ist, zählt einmal — kein Ersetzen', () => {
    const prefPlane = pool.map((e) => e.slug === 'lateral_lunge' ? { ...e, preferred: true } : e)
    const win = patternSlugWindow(prefPlane, 'normal', 0, 'lateral_lunge')
    expect(win[0]).toBe('lateral_lunge')
    expect(win.filter((s) => s === 'lateral_lunge')).toHaveLength(1)
    expect(win).toHaveLength(4)
  })

  it('heavy ignoriert planePin (voller Pool, Reihenfolge wie heute)', () => {
    expect(patternSlugWindow(pool, 'heavy', 0, 'lateral_lunge')).toEqual(patternSlugWindow(pool, 'heavy', 0))
  })

  it('ohne planePin exakt heutiges Verhalten (Rückwärtskompatibilität)', () => {
    expect(patternSlugWindow(pool, 'normal', 2)).toEqual(patternSlugWindow(pool, 'normal', 2, null))
  })
})

describe('isCnsMicroDoseExercise (Dosierungs-Härtung 11.10.: leg_swing ist kein CNS-Reiz)', () => {
  it('Lauf-ABC-Drills bis Int 4 sind Kandidaten (a_skip, high_knees)', () => {
    expect(isCnsMicroDoseExercise(ex({ slug: 'a_skip_drill', category_slug: 'sprints', intensity_score: 4, sprint_type: null }))).toBe(true)
    expect(isCnsMicroDoseExercise(ex({ slug: 'high_knees', category_slug: 'sprints', intensity_score: 4, sprint_type: null }))).toBe(true)
  })
  it('leichte NICHT-explosive Plyo (leg swings) ist KEIN Kandidat', () => {
    expect(isCnsMicroDoseExercise(ex({ slug: 'leg_swing_front_to_back', category_slug: 'lower_body_plyometrics', intensity_score: 2, is_explosive: false }))).toBe(false)
  })
  it('explosive leichte Plyo ist Kandidat, intensive nicht', () => {
    expect(isCnsMicroDoseExercise(ex({ slug: 'ankle_hops', category_slug: 'lower_body_plyometrics', intensity_score: 3, is_explosive: true }))).toBe(true)
    expect(isCnsMicroDoseExercise(ex({ slug: 'pogos', category_slug: 'lower_body_plyometrics', intensity_score: 5, is_explosive: true }))).toBe(false)
  })
  it('Rahmen-Übungen und echte Sprints sind keine Kandidaten', () => {
    expect(isCnsMicroDoseExercise(ex({ slug: 'easy_jog', category_slug: 'sprints', intensity_score: 2, sprint_type: null }))).toBe(false)
    expect(isCnsMicroDoseExercise(ex({ slug: 'sprint_10m', category_slug: 'sprints', intensity_score: 4, sprint_type: 'acceleration' }))).toBe(false)
  })
  it('Warmup-Pool nimmt Drills jetzt bis Int 4 (vorher verhungerte der Drill-Pool bei ≤3)', () => {
    expect(exerciseMatchesBlock(ex({ slug: 'high_knees', category_slug: 'sprints', intensity_score: 4, sprint_type: null }), block('warmup'))).toBe(true)
    expect(exerciseMatchesBlock(ex({ slug: 'b_skip_drill', category_slug: 'sprints', intensity_score: 5, sprint_type: null }), block('warmup'))).toBe(false)
    // leichte nicht-explosive Plyo bleibt als Prep im Pool (nur kein CNS-Kandidat)
    expect(exerciseMatchesBlock(ex({ slug: 'leg_swing_front_to_back', category_slug: 'lower_body_plyometrics', intensity_score: 2, is_explosive: false }), block('warmup'))).toBe(true)
  })
})

describe('Heavy-Fenster-Filter (QA 11.10.: Maximalkraft bleibt linear und schwer)', () => {
  const hv = (slug: string, movement_type = 'sagittal', intensity = 8, preferred = false): V2Exercise =>
    ex({ slug, strength_pattern: 'hinge', movement_type, intensity_score: intensity, preferred })
  const pool = [
    hv('conventional_deadlift'), hv('romanian_deadlift'), hv('sumo_deadlift'),
    hv('single_leg_glute_bridge', 'sagittal', 4),
    hv('rotational_cable_row_hinge', 'transverse', 5),
    hv('single_leg_rdl_lateral_reach', 'frontal', 5),
  ]

  it('heavy filtert Rotation/Frontal und Activation (Int < 5) raus', () => {
    const slugs = patternSlugWindow(pool, 'heavy', 0)
    expect(slugs).toEqual(expect.arrayContaining(['conventional_deadlift', 'romanian_deadlift', 'sumo_deadlift']))
    expect(slugs).not.toContain('rotational_cable_row_hinge')
    expect(slugs).not.toContain('single_leg_rdl_lateral_reach')
    expect(slugs).not.toContain('single_leg_glute_bridge')
  })

  it('Fallback: unter 3 starken sagittalen Optionen bleibt der volle Pool (Datenloch degradiert)', () => {
    const thin = [hv('conventional_deadlift'), hv('romanian_deadlift'), hv('kb_swing_rot', 'transverse', 6)]
    expect(patternSlugWindow(thin, 'heavy', 0)).toHaveLength(3)
  })

  it('Präferenz, die den Filter überlebt, bleibt vorn gepinnt', () => {
    const withPref = pool.map((e) => e.slug === 'sumo_deadlift' ? { ...e, preferred: true } : e)
    expect(patternSlugWindow(withPref, 'heavy', 0)[0]).toBe('sumo_deadlift')
  })

  it('normal-Fenster bleibt ungefiltert (Rotation/Activation weiter wählbar)', () => {
    const all = new Set([
      ...patternSlugWindow(pool, 'normal', 0), ...patternSlugWindow(pool, 'normal', 1),
      ...patternSlugWindow(pool, 'normal', 2), ...patternSlugWindow(pool, 'normal', 3),
      ...patternSlugWindow(pool, 'normal', 4), ...patternSlugWindow(pool, 'normal', 5),
    ])
    expect(all.has('rotational_cable_row_hinge')).toBe(true)
    expect(all.has('single_leg_glute_bridge')).toBe(true)
  })
})
