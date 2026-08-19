import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

/** Best (max and min) raw metric value per assessment slug, from all assessment entries. */
export type BestValues = Record<string, { max: number; min: number }>;

async function fetchBestValues(userId: string): Promise<BestValues> {
    const { data, error } = await supabase
        .from('metric_entries')
        .select(`
            value,
            user_assessment:user_assessments!inner (
                assessment:assessments!inner ( slug )
            )
        `)
        .eq('user_id', userId)
        .eq('source_type', 'assessment');
    if (error) throw error;

    const result: BestValues = {};
    for (const row of data ?? []) {
        const slug = (row.user_assessment as any)?.assessment?.slug as string | undefined;
        if (!slug || row.value == null) continue;
        const v = Number(row.value);
        const cur = result[slug];
        result[slug] = cur
            ? { max: Math.max(cur.max, v), min: Math.min(cur.min, v) }
            : { max: v, min: v };
    }
    return result;
}

export function useAssessmentBestValuesQuery(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.assessmentBestValues(userId),
        queryFn: () => fetchBestValues(userId!),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });
}
