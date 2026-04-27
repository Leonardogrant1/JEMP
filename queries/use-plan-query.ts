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
            .select(`
                id, name, description, session_type, scheduled_at, status,
                estimated_duration_minutes, workout_plan_session_id,
                workout_session_blocks(
                    block_type:block_types(slug),
                    workout_session_block_exercises(order_index, exercise:exercises(slug))
                )
            `)
            .eq('workout_plan_id', plan.id)
            .order('scheduled_at', { ascending: true }),
        supabase
            .from('workout_plan_sessions')
            .select(`
                id, plan_id, name, description, session_type, day_of_week,
                estimated_duration_minutes,
                workout_plan_session_blocks(
                    block_type:block_types(slug),
                    workout_plan_session_block_exercises(order_index, exercise:exercises(slug))
                )
            `)
            .eq('plan_id', plan.id),
    ]);

    function extractPrimaryExerciseSlug(blocks: any[]): string | null {
        const primary = (blocks ?? []).find((b: any) => b.block_type?.slug === 'primary');
        if (!primary) return null;
        const exercises = (primary.workout_session_block_exercises ?? primary.workout_plan_session_block_exercises ?? []);
        const sorted = [...exercises].sort((a: any, b: any) => a.order_index - b.order_index);
        return sorted[0]?.exercise?.slug ?? null;
    }

    return {
        plan,
        sessions: (sessionsRes.data ?? []).map(s => ({
            ...s,
            primary_exercise_slug: extractPrimaryExerciseSlug((s as any).workout_session_blocks ?? []),
        })),
        planSessions: (planSessionsRes.data ?? []).map(ps => ({
            ...ps,
            primary_exercise_slug: extractPrimaryExerciseSlug((ps as any).workout_plan_session_blocks ?? []),
        })),
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
