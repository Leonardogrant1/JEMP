import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

async function fetchUserCategoryLevels(userId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase
        .from('user_category_levels')
        .select(`
            level_score,
            category:categories ( slug )
        `)
        .eq('user_id', userId);

    if (error) throw error;

    const result: Record<string, number> = {};
    for (const row of data ?? []) {
        const slug = (row.category as any)?.slug;
        if (slug) result[slug] = row.level_score;
    }
    return result;
}

export function useUserCategoryLevelsQuery(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.userCategoryLevels(userId),
        queryFn: () => fetchUserCategoryLevels(userId!),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });
}
