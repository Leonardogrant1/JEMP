import type { Enums, Tables } from '@/database.types';
import { useInvalidate } from '@/queries/use-invalidate';
import { usePlanQuery } from '@/queries/use-plan-query';
import { createContext, useCallback, useContext, useMemo } from 'react';

export type WorkoutSession = Pick<
    Tables<'workout_sessions'>,
    'id' | 'name' | 'description' | 'session_type' | 'scheduled_at' | 'status' | 'estimated_duration_minutes' | 'workout_plan_session_id'
>;

export type ActivePlan = Pick<
    Tables<'workout_plans'>,
    'id' | 'name' | 'start_date' | 'end_date'
>;

export type PlanSession = Pick<
    Tables<'workout_plan_sessions'>,
    'id' | 'name' | 'description' | 'session_type' | 'day_of_week' | 'estimated_duration_minutes'
>;

export type SessionStatus = Enums<'session_status'>;

type PlanContextType = {
    plan: ActivePlan | null;
    sessions: WorkoutSession[];
    planSessions: PlanSession[];
    isLoading: boolean;
    streak: number;
    refresh: () => Promise<void>;
};

function computeStreak(sessions: WorkoutSession[]): number {
    const byDate = new Map<string, WorkoutSession[]>();
    for (const s of sessions) {
        const key = s.scheduled_at?.split('T')[0];
        if (!key) continue;
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key)!.push(s);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let streak = 0;
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
        const dateStr = d.toISOString().split('T')[0];
        const day = byDate.get(dateStr);

        if (!day || day.length === 0) {
            d.setUTCDate(d.getUTCDate() - 1);
            continue;
        }

        const hasCompleted = day.some(s => s.status === 'completed');

        if (hasCompleted) {
            streak++;
        } else if (dateStr !== todayStr) {
            break;
        }

        d.setUTCDate(d.getUTCDate() - 1);
    }

    return streak;
}

const PlanContext = createContext<PlanContextType | null>(null);

export function PlanProvider({ children }: { children: React.ReactNode }) {
    const { data, isLoading } = usePlanQuery();
    const { invalidatePlan } = useInvalidate();

    const plan = data?.plan ?? null;
    const sessions = (data?.sessions ?? []) as WorkoutSession[];
    const planSessions = (data?.planSessions ?? []) as PlanSession[];
    const streak = useMemo(() => computeStreak(sessions), [sessions]);

    const refresh = useCallback(async () => { await invalidatePlan(); }, [invalidatePlan]);

    return (
        <PlanContext.Provider value={{ plan, sessions, planSessions, isLoading, streak, refresh }}>
            {children}
        </PlanContext.Provider>
    );
}

export function usePlan() {
    const ctx = useContext(PlanContext);
    if (!ctx) throw new Error('usePlan must be used within PlanProvider');
    return ctx;
}
