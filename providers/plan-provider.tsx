import { supabase } from '@/services/supabase/client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useCurrentUser } from './current-user-provider';

// ── Types ─────────────────────────────────────────────────────────────────

export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';

export type WorkoutSession = {
    id: string;
    name: string;
    description: string | null;
    session_type: 'training' | 'recovery';
    scheduled_at: string;
    status: SessionStatus;
    estimated_duration_minutes: number | null;
};

export type ActivePlan = {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
};

type PlanContextType = {
    plan: ActivePlan | null;
    sessions: WorkoutSession[];
    isLoading: boolean;
    streak: number;
    refresh: () => Promise<void>;
};

function computeStreak(sessions: WorkoutSession[]): number {
    const byDate = new Map<string, WorkoutSession[]>();
    for (const s of sessions) {
        const key = s.scheduled_at.split('T')[0];
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

// ── Context ───────────────────────────────────────────────────────────────

const PlanContext = createContext<PlanContextType | null>(null);

export function PlanProvider({ children }: { children: React.ReactNode }) {
    const { profile } = useCurrentUser();

    const [plan, setPlan] = useState<ActivePlan | null>(null);
    const [sessions, setSessions] = useState<WorkoutSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPlan = useCallback(async () => {
        if (!profile?.id) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        const { data: planData } = await supabase
            .from('workout_plans')
            .select('id, name, start_date, end_date')
            .eq('user_id', profile.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .maybeSingle();

        if (!planData) {
            setPlan(null);
            setSessions([]);
            setIsLoading(false);
            return;
        }

        setPlan(planData);

        const { data: sessionData } = await supabase
            .from('workout_sessions')
            .select('id, name, description, session_type, scheduled_at, status, estimated_duration_minutes')
            .eq('workout_plan_id', planData.id)
            .order('scheduled_at', { ascending: true });

        setSessions(sessionData ?? []);
        setIsLoading(false);
    }, [profile?.id]);

    useEffect(() => { fetchPlan(); }, [fetchPlan]);

    const streak = computeStreak(sessions);

    return (
        <PlanContext.Provider value={{ plan, sessions, isLoading, streak, refresh: fetchPlan }}>
            {children}
        </PlanContext.Provider>
    );
}

export function usePlan() {
    const ctx = useContext(PlanContext);
    if (!ctx) throw new Error('usePlan must be used within PlanProvider');
    return ctx;
}
