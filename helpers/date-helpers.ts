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
    const jsDay = day.getDay(); // 0=So, 1=Mo, …, 6=Sa
    const dow = jsDay === 0 ? 7 : jsDay; // DB: 1=Mo, 7=So
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

export {
    getISOWeek, getPreviewSession, getWeekDays,
    toDateStr
};

