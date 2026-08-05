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
                id, name, description, session_type, scheduled_at, original_scheduled_at, status,
                estimated_duration_minutes, workout_plan_session_id, rest_adjust_seconds,
                workout_session_blocks(
                    block_type:block_types(slug),
                    workout_session_block_exercises(order_index, exercise:exercises(slug, image_group, category:categories(slug)))
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
                    workout_plan_session_block_exercises(order_index, exercise:exercises(slug, image_group, category:categories(slug)))
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

    // Top 2 category slugs of the actual training work — warmup/cooldown
    // blocks would dilute the focus
    function extractFocusCategories(blocks: any[]): string[] {
        const counts = new Map<string, number>();
        for (const block of (blocks ?? [])) {
            if (!['primary', 'secondary'].includes(block.block_type?.slug)) continue;
            const exercises = (block.workout_session_block_exercises ?? block.workout_plan_session_block_exercises ?? []);
            for (const ex of exercises) {
                const cat = ex.exercise?.category?.slug;
                if (cat) counts.set(cat, (counts.get(cat) ?? 0) + 1);
            }
        }
        return [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([slug]) => slug);
    }

    return {
        plan,
        sessions: (sessionsRes.data ?? []).map(s => {
            const blocks = (s as any).workout_session_blocks ?? [];
            const { slug, imageGroup } = extractPrimaryExerciseInfo(blocks);
            return { ...s, primary_exercise_slug: slug, primary_image_group: imageGroup, focus_categories: extractFocusCategories(blocks) };
        }),
        planSessions: (planSessionsRes.data ?? []).map(ps => {
            const blocks = (ps as any).workout_plan_session_blocks ?? [];
            const { slug, imageGroup } = extractPrimaryExerciseInfo(blocks);
            return { ...ps, primary_exercise_slug: slug, primary_image_group: imageGroup, focus_categories: extractFocusCategories(blocks) };
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
