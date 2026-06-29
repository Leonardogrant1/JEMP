import { toDatabaseDow } from "./session-helpers";
import { PlanSession, WorkoutSession } from "@/providers/plan-provider";

function getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekDays(date: Date): Date[] {
    const dow = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - (dow === 0 ? 6 : dow - 1));
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

function toDateStr(date: Date): string {
    return date.toISOString().split('T')[0];
}

function getPreviewSession(
    day: Date,
    sessions: WorkoutSession[],
    planSessionByDow: Map<number, PlanSession>,
): PlanSession | null {
    const dateStr = toDateStr(day);
    const hasReal = sessions.some(s => toDateStr(new Date(s.scheduled_at!)) === dateStr);
    if (hasReal) return null;
    const dow = toDatabaseDow(day);
    const planSession = planSessionByDow.get(dow);
    if (!planSession) return null;
    // Don't show preview if a real session for this plan template already exists this week
    // (e.g. rescheduled to another day) — restrict to current week to avoid matching past weeks
    const weekDayStrs = new Set(getWeekDays(day).map(toDateStr));
    const existsThisWeek = sessions.some(s =>
        s.workout_plan_session_id === planSession.id &&
        s.scheduled_at != null &&
        weekDayStrs.has(toDateStr(new Date(s.scheduled_at)))
    );
    if (existsThisWeek) return null;
    return planSession;
}

// JS getDay(): 0=Sun,1=Mon,...,6=Sat → DAY_KEYS index: 0=Mon,...,6=Sun
const DAY_KEYS = [
    'onboarding.workout_prefs_day_mon',
    'onboarding.workout_prefs_day_tue',
    'onboarding.workout_prefs_day_wed',
    'onboarding.workout_prefs_day_thu',
    'onboarding.workout_prefs_day_fri',
    'onboarding.workout_prefs_day_sat',
    'onboarding.workout_prefs_day_sun',
] as const;

function dowToDayKey(jsDow: number): typeof DAY_KEYS[number] {
    return DAY_KEYS[jsDow === 0 ? 6 : jsDow - 1];
}

function getDow(isoDate: string): number {
    return new Date(isoDate.split('T')[0]).getDay();
}

function shiftDate(scheduledAt: string, dayDiff: number): string {
    const [datePart, ...rest] = scheduledAt.split('T');
    const d = new Date(datePart);
    d.setDate(d.getDate() + dayDiff);
    const newDatePart = d.toISOString().split('T')[0];
    return `${newDatePart}T${rest.join('T')}`;
}

export {
    DAY_KEYS, dowToDayKey, getDow, getISOWeek, getPreviewSession, getWeekDays,
    shiftDate, toDateStr,
};

