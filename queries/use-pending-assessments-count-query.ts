import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

async function fetchPendingAssessmentsCount(userId: string): Promise<number> {
    const { count } = await supabase
        .from('user_assessments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['pending', 'in_progress']);

    return count ?? 0;
}

export function usePendingAssessmentsCountQuery(userId: string | undefined) {
    return useQuery({
        queryKey: [...queryKeys.userAssessments(userId), 'count'],
        queryFn: () => fetchPendingAssessmentsCount(userId!),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });
}
