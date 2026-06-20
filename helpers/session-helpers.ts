import { type DayVariant } from '@/components/rest-day-card';
import { type WorkoutSession, type PlanSession } from '@/providers/plan-provider';
import { type WeeklySchedule } from '@/types/database';


function toDatabaseDow(date: Date): number {
    const jsDay = date.getDay();
    return jsDay === 0 ? 7 : jsDay;
}

function getSessionModeSlug(
    session: WorkoutSession | null | undefined,
    planSessions: PlanSession[]
): string | null {
    if (!session?.workout_plan_session_id) return null;
    return planSessions.find(ps => ps.id === session.workout_plan_session_id)?.mode_slug ?? null;
}


function getNextScheduledSession(sessions: WorkoutSession[]): WorkoutSession | null {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    return sessions
        .filter(s => s.status === 'scheduled' && s.scheduled_at != null && new Date(s.scheduled_at) >= tomorrowStart)
        .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0] ?? null;
}


function getTodaySession(sessions: WorkoutSession[]) {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const isToday = (s: WorkoutSession) => {
        const d = new Date(s.scheduled_at!);
        return d >= todayStart && d < tomorrowStart;
    };

    // Priority: in_progress > completed today > scheduled today
    const inProgress = sessions.find(s => s.status === 'in_progress');
    if (inProgress) return inProgress;

    const completedToday = sessions.find(s => s.status === 'completed' && isToday(s));
    if (completedToday) return completedToday;

    const scheduledToday = sessions.find(s => s.status === 'scheduled' && isToday(s));
    return scheduledToday ?? null;
}


function getDayVariant(date: Date, weeklySchedule: WeeklySchedule | null | undefined, sportSlug?: string | null): DayVariant {
    if (!weeklySchedule?.sessions?.length) return 'rest';
    const dow = toDatabaseDow(date);
    const sportSession = weeklySchedule.sessions.find(s => s.day_of_week === dow);
    if (!sportSession) return 'rest';

    const COMBAT_SPORTS = new Set(['boxing', 'mma', 'wrestling', 'judo', 'bjj', 'kickboxing', 'karate', 'taekwondo']);
    const isCombat = COMBAT_SPORTS.has(sportSlug ?? '');

    if (sportSession.type === 'tournament') return 'tournament';
    if (sportSession.type === 'game') return isCombat ? 'fight' : 'game';
    return 'training';
}


export { getNextScheduledSession, getTodaySession, getDayVariant, toDatabaseDow, getSessionModeSlug };
