import { computeLoadProfile, maxWorkoutDays, MIN_WORKOUT_DAYS } from '@/lib/load-profile';
import { WeeklyScheduleSession } from '@/types/user-data';

function session(intensity: number): WeeklyScheduleSession {
    return { day_of_week: 1, type: 'team_training', intensity };
}

describe('maxWorkoutDays', () => {
    it('erlaubt bei low load bis zu 5 Einheiten', () => {
        expect(maxWorkoutDays('low')).toBe(5);
    });

    it('erlaubt bei medium load bis zu 3 Einheiten', () => {
        expect(maxWorkoutDays('medium')).toBe(3);
    });

    it('erlaubt bei high load bis zu 2 Einheiten', () => {
        expect(maxWorkoutDays('high')).toBe(2);
    });

    it('Minimum ist immer 2 Einheiten', () => {
        expect(MIN_WORKOUT_DAYS).toBe(2);
    });

    it('ohne Sport-Termine zählt als low → 5 Einheiten', () => {
        const { load_profile } = computeLoadProfile([]);
        expect(maxWorkoutDays(load_profile)).toBe(5);
    });

    it('hohe Vereinsbelastung ergibt high → 2 Einheiten', () => {
        const { load_profile } = computeLoadProfile([session(9), session(9), session(9)]);
        expect(maxWorkoutDays(load_profile)).toBe(2);
    });
});
