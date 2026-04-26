import { useCurrentUser } from '@/providers/current-user-provider';
import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

 
async function fetchActivePlan(userId: string) {
    const { data: plan } = await supabase
        .from('workout_plans')
        .select('id, name, start_date, end_date')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .maybeSingle();

    if (!plan) return { plan: null, sessions: [], planSessions: [] };

    const [sessionsRes, planSessionsRes] = await Promise.all([
        supabase
            .from('workout_sessions')
            .select('id, name, description, session_type, scheduled_at, status, estimated_duration_minutes, workout_plan_session_id')
            .eq('workout_plan_id', plan.id)
            .order('scheduled_at', { ascending: true }),
        supabase
            .from('workout_plan_sessions')
            .select('id, plan_id, name, description, session_type, day_of_week, estimated_duration_minutes')
            .eq('plan_id', plan.id),
    ]);

    return {
        plan,
        sessions: sessionsRes.data ?? [],
        planSessions: planSessionsRes.data ?? [],
    };
}

export function usePlanQuery() {
    const { profile } = useCurrentUser();

    return useQuery({
        queryKey: queryKeys.plan(profile?.id),
        queryFn: () => fetchActivePlan(profile!.id),
        enabled: !!profile?.id,
        staleTime: 5 * 60 * 1000,
    });
}
