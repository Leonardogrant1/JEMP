import type { CategorySlug } from '@/constants/categories';

export type AchievementDef = {
    slug: string;               // unique, e.g. 'bench_press_1rm_100_m'
    assessmentSlug: string;     // must exist in ASSESSMENT_SCORE_MAP (guarded by test)
    category: CategorySlug;     // grouping on the achievements screen
    threshold: number;          // metric base unit (kg, cm, s, reps); weighted pull-ups = ADDED weight
    unit: 'kg' | 'cm' | 's' | 'count';
    direction: 'gte' | 'lte';   // lte for times (lower is better)
    gender?: 'male' | 'female'; // omitted = applies to everyone
};

function ladder(
    assessmentSlug: string,
    category: CategorySlug,
    unit: AchievementDef['unit'],
    direction: AchievementDef['direction'],
    thresholds: number[],
    gender?: 'male' | 'female',
): AchievementDef[] {
    const suffix = gender === 'female' ? '_f' : gender === 'male' ? '_m' : '';
    return thresholds.map(t => ({
        slug: `${assessmentSlug}_${String(t).replace('.', '_')}${suffix}`,
        assessmentSlug,
        category,
        threshold: t,
        unit,
        direction,
        ...(gender && { gender }),
    }));
}

// Thresholds are curated values — metric-round by design (the "100kg Club" stays 100 kg,
// imperial users see the converted display value). Gender-split ladders exist for the
// 1RM lifts; everything else is neutral. Mobility has no absolute milestones (1-10 self-rating).
export const ACHIEVEMENTS: AchievementDef[] = [
    // ── Strength — 1RM (gender-specific) ─────────────────────────────
    ...ladder('bench_press_1rm', 'strength', 'kg', 'gte', [60, 80, 100, 140], 'male'),
    ...ladder('bench_press_1rm', 'strength', 'kg', 'gte', [40, 60, 80, 100], 'female'),
    ...ladder('back_squat_1rm', 'strength', 'kg', 'gte', [100, 140, 180, 220], 'male'),
    ...ladder('back_squat_1rm', 'strength', 'kg', 'gte', [60, 90, 120, 150], 'female'),
    ...ladder('romanian_deadlift_1rm', 'strength', 'kg', 'gte', [100, 140, 180, 220], 'male'),
    ...ladder('romanian_deadlift_1rm', 'strength', 'kg', 'gte', [60, 90, 120, 150], 'female'),
    ...ladder('hip_thrust_1rm', 'strength', 'kg', 'gte', [140, 180, 220, 260], 'male'),
    ...ladder('hip_thrust_1rm', 'strength', 'kg', 'gte', [100, 140, 180, 220], 'female'),
    // Weighted pull-ups: threshold = ADDED weight in kg (matches the assessment input)
    ...ladder('weighted_pullups_1rm', 'strength', 'kg', 'gte', [10, 20, 40], 'male'),
    ...ladder('weighted_pullups_1rm', 'strength', 'kg', 'gte', [5, 12, 25], 'female'),
    // ── Strength — bodyweight reps (neutral) ─────────────────────────
    ...ladder('max_pullups', 'strength', 'count', 'gte', [5, 10, 15, 20]),
    ...ladder('max_pushups', 'strength', 'count', 'gte', [20, 40, 60]),
    ...ladder('max_dips', 'strength', 'count', 'gte', [10, 20, 30]),
    // ── Jumps ─────────────────────────────────────────────────────────
    ...ladder('vertical_jump', 'jumps', 'cm', 'gte', [40, 50, 60, 70]),
    ...ladder('broad_jump', 'jumps', 'cm', 'gte', [200, 250, 300]),
    ...ladder('box_jump', 'jumps', 'cm', 'gte', [80, 100, 120]),
    // ── Upper-body plyometrics ────────────────────────────────────────
    ...ladder('mb_chest_throw', 'upper_body_plyometrics', 'cm', 'gte', [400, 500, 600]),
    ...ladder('mb_overhead_throw', 'upper_body_plyometrics', 'cm', 'gte', [800, 1000, 1200]),
    ...ladder('mb_rotational_throw', 'upper_body_plyometrics', 'cm', 'gte', [500, 650, 800]),
    ...ladder('clap_pushups', 'upper_body_plyometrics', 'count', 'gte', [5, 15, 30]),
    // ── Speed (lower is better) ───────────────────────────────────────
    ...ladder('sprint_10m', 'lower_body_plyometrics', 's', 'lte', [2.0, 1.85, 1.7]),
    ...ladder('sprint_30m', 'lower_body_plyometrics', 's', 'lte', [4.6, 4.2, 3.9]),
    ...ladder('sprint_10m_flying', 'lower_body_plyometrics', 's', 'lte', [1.25, 1.1, 1.0]),
    ...ladder('agility_505', 'lower_body_plyometrics', 's', 'lte', [2.6, 2.4, 2.2]),
];

export type AchievementLadder = {
    assessmentSlug: string;
    category: CategorySlug;
    defs: AchievementDef[];
};

/** Ladders applicable to a gender, in catalog order, grouped per assessment. */
export function laddersForGender(gender: 'male' | 'female'): AchievementLadder[] {
    const ladders: AchievementLadder[] = [];
    for (const def of ACHIEVEMENTS) {
        if (def.gender && def.gender !== gender) continue;
        const existing = ladders.find(l => l.assessmentSlug === def.assessmentSlug);
        if (existing) existing.defs.push(def);
        else ladders.push({ assessmentSlug: def.assessmentSlug, category: def.category, defs: [def] });
    }
    return ladders;
}
