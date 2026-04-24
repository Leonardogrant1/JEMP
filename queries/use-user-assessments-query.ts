import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

async function fetchUserAssessments(userId: string) {
    const { data } = await supabase
        .from('user_assessments')
        .select(`
            id, status, completed_at,
            assessment:assessments (
                id, slug, name, description,
                category:categories ( slug ),
                metric:metrics!measured_metric_id ( slug, unit ),
                assessment_equipments ( equipment:equipments ( slug ) )
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    return (data ?? []).map((ua) => ({
        id: ua.id,
        status: ua.status,
        completed_at: ua.completed_at,
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
