export type TierSlug = 'apex' | 'elite' | 'advanced' | 'average' | 'beginner' | 'novice';

export type Tier = {
    slug: TierSlug;
    min: number;      // inclusive lower bound of the 1-100 score range
    color: string;    // accent for chips and labels
    i18nKey: string;  // display name (English in all locales)
};

// Ordered top-down; tierForScore picks the first tier whose min the score reaches.
export const TIERS: Tier[] = [
    { slug: 'apex',     min: 90, color: '#FFD700', i18nKey: 'tiers.apex' },
    { slug: 'elite',    min: 85, color: '#A78BFA', i18nKey: 'tiers.elite' },
    { slug: 'advanced', min: 65, color: '#22D3EE', i18nKey: 'tiers.advanced' },
    { slug: 'average',  min: 45, color: '#C0C0C0', i18nKey: 'tiers.average' },
    { slug: 'beginner', min: 25, color: '#CD7F32', i18nKey: 'tiers.beginner' },
    { slug: 'novice',   min: 1,  color: '#94A3B8', i18nKey: 'tiers.novice' },
];

export function tierForScore(score: number): Tier {
    const clamped = Math.max(1, Math.min(100, Math.round(score)));
    return TIERS.find(t => clamped >= t.min) ?? TIERS[TIERS.length - 1];
}

/** The next-higher tier, or null when already at the top. */
export function nextTier(score: number): Tier | null {
    const current = tierForScore(score);
    const idx = TIERS.indexOf(current);
    return idx > 0 ? TIERS[idx - 1] : null;
}
