import { restDurationSeconds } from '../rest-duration';

describe('restDurationSeconds', () => {
    it('skips rest entirely in warmup and cooldown blocks, regardless of stored value', () => {
        expect(restDurationSeconds({ targetRestSeconds: 15, blockTypeSlug: 'warmup', sessionDefaultSeconds: 60, adjustSeconds: 0 })).toBe(0);
        expect(restDurationSeconds({ targetRestSeconds: 30, blockTypeSlug: 'cooldown', sessionDefaultSeconds: 60, adjustSeconds: 30 })).toBe(0);
    });

    it('keeps rest for distance-based warmup drills (walk-back is the pause)', () => {
        expect(restDurationSeconds({ targetRestSeconds: 60, blockTypeSlug: 'warmup', targetDistanceMeters: 30, sessionDefaultSeconds: 60, adjustSeconds: 0 })).toBe(60);
    });

    it('honors an explicit 0 from the generator (no falsy fallback)', () => {
        expect(restDurationSeconds({ targetRestSeconds: 0, blockTypeSlug: 'conditioning', sessionDefaultSeconds: 60, adjustSeconds: 0 })).toBe(0);
    });

    it('falls back to the session default, then 60s, when no target is set', () => {
        expect(restDurationSeconds({ targetRestSeconds: null, blockTypeSlug: 'lower_strength', sessionDefaultSeconds: 90, adjustSeconds: 0 })).toBe(90);
        expect(restDurationSeconds({ targetRestSeconds: undefined, blockTypeSlug: 'lower_strength', sessionDefaultSeconds: null, adjustSeconds: null })).toBe(60);
    });

    it('applies the day-form adjustment with a 15s floor for real pauses', () => {
        expect(restDurationSeconds({ targetRestSeconds: 120, blockTypeSlug: 'lower_strength', sessionDefaultSeconds: 60, adjustSeconds: -30 })).toBe(90);
        expect(restDurationSeconds({ targetRestSeconds: 20, blockTypeSlug: 'lower_strength', sessionDefaultSeconds: 60, adjustSeconds: -30 })).toBe(15);
    });
});
