import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

async function fetchHasHadPlan(userId: string): Promise<boolean> {
    const { count } = await supabase
        .from('workout_plans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

    return (count ?? 0) > 0;
}

export function useHasHadPlanQuery(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.hasHadPlan(userId),
        queryFn: () => fetchHasHadPlan(userId!),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });
}
