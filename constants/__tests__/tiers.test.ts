import { TIERS, tierForScore, nextTier } from '../tiers';

describe('tierForScore', () => {
    it.each([
        [1, 'novice'], [24, 'novice'],
        [25, 'beginner'], [44, 'beginner'],
        [45, 'average'], [64, 'average'],
        [65, 'advanced'], [84, 'advanced'],
        [85, 'elite'], [89, 'elite'],
        [90, 'apex'], [100, 'apex'],
    ])('score %i → %s', (score, slug) => {
        expect(tierForScore(score).slug).toBe(slug);
    });

    it('clamps out-of-range scores', () => {
        expect(tierForScore(0).slug).toBe('novice');
        expect(tierForScore(-5).slug).toBe('novice');
        expect(tierForScore(140).slug).toBe('apex');
    });

    it('rounds fractional scores', () => {
        expect(tierForScore(89.6).slug).toBe('apex');
        expect(tierForScore(89.4).slug).toBe('elite');
    });
});

describe('nextTier', () => {
    it('returns the next-higher tier', () => {
        expect(nextTier(70)?.slug).toBe('elite');
        expect(nextTier(86)?.slug).toBe('apex');
    });
    it('returns null at the top', () => {
        expect(nextTier(95)).toBeNull();
    });
});

describe('TIERS', () => {
    it('is ordered top-down by min', () => {
        for (let i = 1; i < TIERS.length; i++) {
            expect(TIERS[i].min).toBeLessThan(TIERS[i - 1].min);
        }
    });
});
