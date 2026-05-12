import { WeeklyScheduleSession } from '@/types/user-data';

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
