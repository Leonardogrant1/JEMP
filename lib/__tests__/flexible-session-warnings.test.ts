import { getFlexibleDayWarnings } from '../flexible-session-warnings';

describe('getFlexibleDayWarnings', () => {
    const base = {
        sessionType: 'speed' as const,
        workoutDows: [2, 4, 6],
        heavyLowerDow: 2,
    };

    it('warns when a sprint lands on a day that already has a workout', () => {
        const warnings = getFlexibleDayWarnings({ ...base, targetDow: 4 });
        expect(warnings).toContain('workout_same_day');
    });

    it('warns when a sprint lands directly before or after the heavy lower day', () => {
        expect(getFlexibleDayWarnings({ ...base, targetDow: 1 })).toContain('near_heavy_lower');
        expect(getFlexibleDayWarnings({ ...base, targetDow: 3 })).toContain('near_heavy_lower');
    });

    it('reports both warnings on the heavy lower day itself', () => {
        const warnings = getFlexibleDayWarnings({ ...base, targetDow: 2 });
        expect(warnings).toContain('workout_same_day');
        expect(warnings).toContain('near_heavy_lower');
    });

    it('returns no warnings for a free day with distance to the heavy lower day', () => {
        expect(getFlexibleDayWarnings({ ...base, targetDow: 5 })).toEqual([]);
    });

    it('never warns for mobility sessions', () => {
        expect(getFlexibleDayWarnings({ ...base, sessionType: 'mobility', targetDow: 2 })).toEqual([]);
    });

    it('skips the heavy-lower warning when no heavy lower day is known (old plans)', () => {
        expect(getFlexibleDayWarnings({ ...base, heavyLowerDow: null, targetDow: 1 })).toEqual([]);
    });

    it('treats the week as cyclic: Sunday sprint warns before a Monday heavy lower day', () => {
        expect(getFlexibleDayWarnings({ ...base, heavyLowerDow: 1, targetDow: 7 })).toContain('near_heavy_lower');
    });
});
