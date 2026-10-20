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

  it('hält cooldown-only Mobility (Box Breathing) aus dem Warmup, Warmup-only aus dem Cooldown (QA 09.10.)', () => {
    const pool = [
      ...basePool,
      ex({ slug: 'box_breathing', category_slug: 'mobility', measurement_type: 'duration', intensity_score: 1, legacy_block_slugs: ['cooldown'] }),
      ex({ slug: 'arm_circle', category_slug: 'mobility', measurement_type: 'duration', intensity_score: 1, legacy_block_slugs: ['warmup'] }),
    ]
    const r = buildSpeedSession({ day: day(), exercises: pool, levels: { sprints: 2, cod: 2 }, allowMaxVelocity: true, orderIndex: 0 })!
    const warmup = r.session.blocks.find((b: any) => b.block_type === 'warmup')!.exercises.map((e: any) => e.exercise_slug)
    const cooldown = r.session.blocks.find((b: any) => b.block_type === 'cooldown')!.exercises.map((e: any) => e.exercise_slug)
    expect(warmup).not.toContain('box_breathing')
    expect(cooldown).not.toContain('arm_circle')
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

describe('flexible_window Durchreichung (Spec 2026-10-09)', () => {
  it('die Speed-Session trägt das Fenster des Tages', () => {
    const r = buildSpeedSession({ day: day({ flexible_window: [1, 2, 3, 7] }), exercises: basePool, levels: { sprints: 2, cod: 2 }, allowMaxVelocity: true, orderIndex: 0 })!
    expect(r.session.flexible_window).toEqual([1, 2, 3, 7])
  })
})

describe('speed session outdoor environment (Sprint-Env-Fix 09.10.)', () => {
    it('stempelt die übergebene Outdoor-Umgebung auf die Session', () => {
        const r = buildSpeedSession({ day: day(), exercises: basePool, levels: { sprints: 2, cod: 1 }, allowMaxVelocity: true, orderIndex: 0, environmentId: 'env-outdoor-uuid' })!;
        expect((r.session as any).environment_id).toBe('env-outdoor-uuid');
    });
    it('lässt environment_id weg, wenn keine übergeben wird (Fallback in save-plan)', () => {
        const r = buildSpeedSession({ day: day(), exercises: basePool, levels: { sprints: 2, cod: 1 }, allowMaxVelocity: true, orderIndex: 0 })!;
        expect((r.session as any).environment_id).toBeUndefined();
    });
});

describe('speed session coaching template (09.10.: Warmup-Rampe, Qualitäts-Volumen, gezielter Cooldown)', () => {
    const templatePool = [
        ex({ slug: 'easy_jog', category_slug: 'sprints', intensity_score: 2, measurement_type: 'duration', legacy_block_slugs: ['warmup', 'cooldown'] }),
        ex({ slug: 'leg_swing_front_to_back', category_slug: 'lower_body_plyometrics', intensity_score: 2, measurement_type: 'duration', legacy_block_slugs: ['warmup'] }),
        ex({ slug: 'ankle_cars', category_slug: 'mobility', intensity_score: 1, measurement_type: 'duration', legacy_block_slugs: ['warmup', 'cooldown'] }),
        ex({ slug: 'a_skip_drill', category_slug: 'sprints', intensity_score: 4, measurement_type: 'reps_or_duration', legacy_block_slugs: ['warmup'] }),
        ex({ slug: 'b_skip_drill', category_slug: 'sprints', intensity_score: 5, measurement_type: 'reps_or_duration', legacy_block_slugs: ['warmup'] }),
        ex({ slug: 'build_up_run', category_slug: 'sprints', intensity_score: 5, measurement_type: 'distance', legacy_block_slugs: ['warmup'] }),
        ex({ slug: 'sprint_10m', sprint_type: 'acceleration', category_slug: 'sprints', intensity_score: 7, measurement_type: 'distance' }),
        ex({ slug: 'acceleration_sprint_10m', sprint_type: 'acceleration', category_slug: 'sprints', intensity_score: 7, measurement_type: 'distance' }),
        ex({ slug: 'hill_sprint', sprint_type: 'acceleration', category_slug: 'sprints', intensity_score: 8, measurement_type: 'distance' }),
        ex({ slug: 'pro_agility_shuttle', category_slug: 'cod', intensity_score: 8, measurement_type: 'reps_or_duration' }),
        ex({ slug: 'lateral_shuffle', category_slug: 'cod', intensity_score: 5, measurement_type: 'time' }),
        ex({ slug: 'hip_flexor_lunge_stretch', category_slug: 'mobility', intensity_score: 2, measurement_type: 'duration', legacy_block_slugs: ['cooldown'] }),
        ex({ slug: 'hamstring_foam_roll', category_slug: 'mobility', intensity_score: 2, measurement_type: 'duration', legacy_block_slugs: ['cooldown'] }),
        ex({ slug: 'box_breathing', category_slug: 'mobility', intensity_score: 1, measurement_type: 'duration', legacy_block_slugs: ['cooldown'] }),
    ];
    const build = () => buildSpeedSession({ day: day(), exercises: templatePool, levels: { sprints: 2, cod: 1 }, allowMaxVelocity: false, orderIndex: 0 })!;

    it('Warmup-Rampe: Traben → dynamische Mobility → Lauf-ABC → Steigerungsläufe als letztes', () => {
        const warmup = build().session.blocks.find((b: any) => b.block_type === 'warmup')!.exercises.map((e: any) => e.exercise_slug);
        expect(warmup[0]).toBe('easy_jog');
        expect(warmup[warmup.length - 1]).toBe('build_up_run');
        expect(warmup).toContain('a_skip_drill');
        const dynIdx = warmup.findIndex((s: string) => s === 'leg_swing_front_to_back' || s === 'ankle_cars');
        expect(dynIdx).toBeGreaterThan(0);
        expect(dynIdx).toBeLessThan(warmup.indexOf('a_skip_drill'));
    });

    it('Hauptteil: genau EINE Antritts-Übung, 6–8 Starts, 20m, volle Pausen (≥150s)', () => {
        const sprint = build().session.blocks.find((b: any) => b.block_type === 'sprint')!.exercises;
        expect(sprint).toHaveLength(1);
        expect(sprint[0].target_sets).toBeGreaterThanOrEqual(6);
        expect(sprint[0].target_sets).toBeLessThanOrEqual(8);
        expect(sprint[0].target_distance_meters).toBe(20);
        expect(sprint[0].target_rest_seconds).toBeGreaterThanOrEqual(150);
    });

    it('Hauptübung passt zum Sportler: Kampfsportler bekommen den Bergsprint, Teamsportler den flachen Antritt', () => {
        const combat = buildSpeedSession({ day: day(), exercises: templatePool, levels: { sprints: 2, cod: 1 }, allowMaxVelocity: false, orderIndex: 0, sportGroup: 'combat_sports' })!;
        const combatSprint = combat.session.blocks.find((b: any) => b.block_type === 'sprint')!.exercises;
        expect(combatSprint.map((e: any) => e.exercise_slug)).toEqual(['hill_sprint']);
        const team = buildSpeedSession({ day: day(), exercises: templatePool, levels: { sprints: 2, cod: 1 }, allowMaxVelocity: false, orderIndex: 0, sportGroup: 'team_sports' })!;
        const teamSprint = team.session.blocks.find((b: any) => b.block_type === 'sprint')!.exercises;
        expect(teamSprint[0].exercise_slug).not.toBe('hill_sprint');
    });

    it('COD-Block: max 2 Drills, 4–6 Wiederholungen gesamt', () => {
        const cod = build().session.blocks.find((b: any) => b.block_type === 'cod')!.exercises;
        expect(cod.length).toBeLessThanOrEqual(2);
        const totalSets = cod.reduce((s: number, e: any) => s + e.target_sets, 0);
        expect(totalSets).toBeGreaterThanOrEqual(4);
        expect(totalSets).toBeLessThanOrEqual(6);
    });

    it('Cooldown: Auslaufen + Hüftbeuger/Hamstring vor generischer Mobility', () => {
        const cooldown = build().session.blocks.find((b: any) => b.block_type === 'cooldown')!.exercises.map((e: any) => e.exercise_slug);
        expect(cooldown[0]).toBe('easy_jog');
        expect(cooldown).toContain('hip_flexor_lunge_stretch');
        expect(cooldown).toContain('hamstring_foam_roll');
        expect(cooldown).not.toContain('box_breathing');
    });
});

describe('COD-Dosierung (Dosierungs-Härtung 11.10.: lateral_shuffle war 5×nichts)', () => {
  it('jede COD-Übung bekommt eine Distanz', () => {
    const r = buildSpeedSession({ day: day(), exercises: basePool, levels: { sprints: 2, cod: 2 }, allowMaxVelocity: true, orderIndex: 0 })!
    const cod = r.session.blocks.find((b: any) => b.block_type === 'cod')!
    for (const e of cod.exercises) {
      expect(e.target_distance_meters, e.exercise_slug).toBeGreaterThan(0)
    }
  })
})

describe('warmup-getaggte COD-Drills im Speed-Warmup (QA 15.10.: Carioca)', () => {
  const carioca = ex({ slug: 'carioca', category_slug: 'cod', intensity_score: 4, measurement_type: 'duration', legacy_block_slugs: ['warmup'] })

  it('nimmt explizit getaggte leichte cod-Drills in die Warmup-Rampe', () => {
    const r = buildSpeedSession({ day: day(), exercises: [...basePool, carioca], levels: { sprints: 2, cod: 0 }, allowMaxVelocity: true, orderIndex: 0 })!
    const warmup = r.session.blocks.find((b: any) => b.block_type === 'warmup')!.exercises.map((e: any) => e.exercise_slug)
    expect(warmup).toContain('carioca')
  })

  it('dedupliziert gegen den COD-Block — kein Drill doppelt in einer Session', () => {
    const pool = [ex({ slug: 'sprint_10m', sprint_type: 'acceleration', category_slug: 'sprints', measurement_type: 'time' }), carioca]
    const r = buildSpeedSession({ day: day(), exercises: pool, levels: { sprints: 2, cod: 2 }, allowMaxVelocity: true, orderIndex: 0 })!
    const slugs = (bt: string) => r.session.blocks.find((b: any) => b.block_type === bt)?.exercises.map((e: any) => e.exercise_slug) ?? []
    expect(slugs('cod')).toContain('carioca')
    expect(slugs('warmup')).not.toContain('carioca')
  })

  it('ohne Warmup-Tag bleibt ein cod-Drill draußen (Tag trägt die Semantik)', () => {
    const untagged = ex({ slug: 'lateral_shuffle', category_slug: 'cod', intensity_score: 4, measurement_type: 'duration' })
    const r = buildSpeedSession({ day: day(), exercises: [...basePool, untagged], levels: { sprints: 2, cod: 0 }, allowMaxVelocity: true, orderIndex: 0 })!
    const warmup = r.session.blocks.find((b: any) => b.block_type === 'warmup')!.exercises.map((e: any) => e.exercise_slug)
    expect(warmup).not.toContain('lateral_shuffle')
  })
})
