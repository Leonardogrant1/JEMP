import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

async function fetchUserAssessments(userId: string) {
    // Completions older than 28 days are outside the renewal cooldown and
    // reappear as pending, so only the current cycle's completions are loaded.
    const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
        .from('user_assessments')
        .select(`
            id, status, completed_at,
            metric_entries ( value, created_at ),
            assessment:assessments (
                id, slug, name, name_i18n, description,
                category:categories ( slug ),
                metric:metrics!measured_metric_id ( slug, unit ),
                assessment_equipments ( equipment:equipments ( slug ) )
            )
        `)
        .eq('user_id', userId)
        .or(`status.in.(pending,in_progress),and(status.eq.completed,completed_at.gt.${since})`)
        // Batch-created rows share created_at, so tiebreak by id for a stable order across refetches
        .order('created_at', { ascending: false })
        .order('id', { ascending: true });

    return (data ?? []).map((ua) => ({
        id: ua.id,
        status: ua.status,
        completed_at: ua.completed_at,
        result_value: ((ua.metric_entries as any[]) ?? [])
            .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0]?.value ?? null,
        assessment: {
            ...(ua.assessment as any),
            equipments: ((ua.assessment as any).assessment_equipments ?? [])
                .map((ae: any) => ae.equipment?.slug)
                .filter((s: any): s is string => !!s),
        },
    }));
}

export type UserAssessment = Awaited<ReturnType<typeof fetchUserAssessments>>[number];

export function useUserAssessmentsQuery(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.userAssessments(userId),
        queryFn: () => fetchUserAssessments(userId!),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });
}
