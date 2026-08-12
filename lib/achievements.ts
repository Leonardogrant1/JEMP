import { ACHIEVEMENTS, AchievementDef } from '@/constants/achievements';

export type UnlockInput = {
    assessmentSlug: string;
    value: number;
    gender: 'male' | 'female';
    alreadyUnlocked: Set<string>;
};

export function meetsThreshold(def: AchievementDef, value: number): boolean {
    return def.direction === 'gte' ? value >= def.threshold : value <= def.threshold;
}

/** Pure award check: which catalog entries does this result newly unlock? */
export function computeNewUnlocks({ assessmentSlug, value, gender, alreadyUnlocked }: UnlockInput): AchievementDef[] {
    return ACHIEVEMENTS.filter(def =>
        def.assessmentSlug === assessmentSlug
        && (!def.gender || def.gender === gender)
        && !alreadyUnlocked.has(def.slug)
        && meetsThreshold(def, value),
    );
}
