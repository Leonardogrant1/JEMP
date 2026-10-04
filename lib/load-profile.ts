import { LoadProfile, WeeklyScheduleSession } from '@/types/user-data';

// Eigene Trainingstage sind supplementär zum Vereinssport: mehr Wochenbelastung
// durch Team-Training/Spiele → weniger zusätzliche Einheiten sinnvoll
export const MIN_WORKOUT_DAYS = 2;

export function maxWorkoutDays(profile: LoadProfile): number {
    switch (profile) {
        case 'low': return 4;
        case 'medium': return 3;
        case 'high': return 2;
    }
}

function intensityToPoints(intensity: number): number {
    if (intensity <= 2) return 1;
    if (intensity <= 4) return 2;
    if (intensity <= 6) return 3;
    if (intensity <= 8) return 4;
    return 5;
}

export function computeLoadProfile(sessions: WeeklyScheduleSession[]): {
    load_score: number;
    load_profile: 'low' | 'medium' | 'high';
} {
    const load_score = sessions.reduce((sum, s) => sum + intensityToPoints(s.intensity), 0);
    const load_profile = load_score <= 4 ? 'low' : load_score <= 10 ? 'medium' : 'high';
    return { load_score, load_profile };
}
