import { ACHIEVEMENTS, laddersForGender } from '@/constants/achievements';
import { computeNewUnlocks } from '../achievements';
import { calculateAssessmentScore } from '@/lib/score-calculators/assessment-score';

const DUMMY_PROFILE = { gender: 'male' as const, weight_kg: 80, height_cm: 182, birth_date: '2000-01-15' };

describe('ACHIEVEMENTS catalog integrity', () => {
    it('has unique slugs', () => {
        const slugs = ACHIEVEMENTS.map(a => a.slug);
        expect(new Set(slugs).size).toBe(slugs.length);
    });

    it('every assessmentSlug is scoreable (exists in ASSESSMENT_SCORE_MAP)', () => {
        const assessmentSlugs = [...new Set(ACHIEVEMENTS.map(a => a.assessmentSlug))];
        for (const slug of assessmentSlugs) {
            expect(calculateAssessmentScore(slug, 2, DUMMY_PROFILE)).not.toBeNull();
        }
    });

    it('ladders are strictly ordered along their direction', () => {
        for (const { defs } of laddersForGender('male').concat(laddersForGender('female'))) {
            for (let i = 1; i < defs.length; i++) {
                if (defs[i].direction === 'gte') {
                    expect(defs[i].threshold).toBeGreaterThan(defs[i - 1].threshold);
                } else {
                    expect(defs[i].threshold).toBeLessThan(defs[i - 1].threshold);
                }
            }
        }
    });
});

describe('computeNewUnlocks', () => {
    it('unlocks every rung at or below the value (ladder auto-unlock)', () => {
        const unlocks = computeNewUnlocks({
            assessmentSlug: 'bench_press_1rm', value: 100, gender: 'male', alreadyUnlocked: new Set(),
        });
        expect(unlocks.map(u => u.slug).sort()).toEqual(
            ['bench_press_1rm_100_m', 'bench_press_1rm_60_m', 'bench_press_1rm_80_m'],
        );
    });

    it('skips already-unlocked rungs', () => {
        const unlocks = computeNewUnlocks({
            assessmentSlug: 'bench_press_1rm', value: 100, gender: 'male',
            alreadyUnlocked: new Set(['bench_press_1rm_60_m', 'bench_press_1rm_80_m']),
        });
        expect(unlocks.map(u => u.slug)).toEqual(['bench_press_1rm_100_m']);
    });

    it('uses the female ladder for female athletes', () => {
        const unlocks = computeNewUnlocks({
            assessmentSlug: 'bench_press_1rm', value: 60, gender: 'female', alreadyUnlocked: new Set(),
        });
        expect(unlocks.map(u => u.slug).sort()).toEqual(
            ['bench_press_1rm_40_f', 'bench_press_1rm_60_f'],
        );
    });

    it('handles lte direction (sprint times)', () => {
        const unlocks = computeNewUnlocks({
            assessmentSlug: 'sprint_30m', value: 4.1, gender: 'male', alreadyUnlocked: new Set(),
        });
        expect(unlocks.map(u => u.slug).sort()).toEqual(['sprint_30m_4_2', 'sprint_30m_4_6']);
    });

    it('returns empty for unknown assessments and missed thresholds', () => {
        expect(computeNewUnlocks({ assessmentSlug: 'deep_squat_hold', value: 10, gender: 'male', alreadyUnlocked: new Set() })).toEqual([]);
        expect(computeNewUnlocks({ assessmentSlug: 'bench_press_1rm', value: 50, gender: 'male', alreadyUnlocked: new Set() })).toEqual([]);
    });

    it('gender-neutral ladders apply to everyone', () => {
        const male = computeNewUnlocks({ assessmentSlug: 'max_pullups', value: 10, gender: 'male', alreadyUnlocked: new Set() });
        const female = computeNewUnlocks({ assessmentSlug: 'max_pullups', value: 10, gender: 'female', alreadyUnlocked: new Set() });
        expect(male.map(u => u.slug)).toEqual(['max_pullups_5', 'max_pullups_10']);
        expect(female.map(u => u.slug)).toEqual(['max_pullups_5', 'max_pullups_10']);
    });
});
