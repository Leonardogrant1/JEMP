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
                estimated_duration_minutes, workout_plan_session_id, rest_adjust_seconds,
                workout_session_blocks(
                    block_type:block_types(slug),
                    workout_session_block_exercises(order_index, exercise:exercises(slug, image_group))
                )
            `)
            .eq('workout_plan_id', plan.id)
            .order('scheduled_at', { ascending: true }),
        supabase
            .from('workout_plan_sessions')
            .select(`
                id, plan_id, name, description, session_type, day_of_week,
                estimated_duration_minutes, mode_slug,
                workout_plan_session_blocks(
                    block_type:block_types(slug),
                    workout_plan_session_block_exercises(order_index, exercise:exercises(slug, image_group))
                )
            `)
            .eq('plan_id', plan.id),
    ]);

    function extractPrimaryExerciseInfo(blocks: any[]): { slug: string | null; imageGroup: string | null } {
        for (const blockSlug of ['primary', 'secondary', 'accessory'] as const) {
            const block = (blocks ?? []).find((b: any) => b.block_type?.slug === blockSlug);
            if (!block) continue;
            const exercises = (block.workout_session_block_exercises ?? block.workout_plan_session_block_exercises ?? []);
            const first = [...exercises].sort((a: any, b: any) => a.order_index - b.order_index)[0]?.exercise;
            if (first) return { slug: first.slug ?? null, imageGroup: first.image_group ?? null };
        }
        return { slug: null, imageGroup: null };
    }

    return {
        plan,
        sessions: (sessionsRes.data ?? []).map(s => {
            const { slug, imageGroup } = extractPrimaryExerciseInfo((s as any).workout_session_blocks ?? []);
            return { ...s, primary_exercise_slug: slug, primary_image_group: imageGroup };
        }),
        planSessions: (planSessionsRes.data ?? []).map(ps => {
            const { slug, imageGroup } = extractPrimaryExerciseInfo((ps as any).workout_plan_session_blocks ?? []);
            return { ...ps, primary_exercise_slug: slug, primary_image_group: imageGroup };
        }),
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
