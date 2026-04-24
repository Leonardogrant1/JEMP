import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

export type CategoryHistoryPoint = { score: number; recordedAt: string };

async function fetchUserCategoryHistory(
    userId: string,
    since: string,
): Promise<Record<string, CategoryHistoryPoint[]>> {
    const [categoriesRes, historyRes] = await Promise.all([
        supabase.from('categories').select('id, slug'),
        supabase
            .from('user_category_level_history')
            .select('level_score, recorded_at, category_id')
            .eq('user_id', userId)
            .gte('recorded_at', since)
            .order('recorded_at', { ascending: true }),
    ]);

    if (categoriesRes.error) throw categoriesRes.error;
    if (historyRes.error) throw historyRes.error;

    console.log('[history] rows fetched:', historyRes.data?.length ?? 0, '| since:', since);

    const slugById = new Map<string | null, string>(
        categoriesRes.data.map(c => [c.id, c.slug])
    );
    // NULL category_id = overall average
    slugById.set(null, 'all');

    const result: Record<string, CategoryHistoryPoint[]> = {};
    for (const row of historyRes.data ?? []) {
        const slug = slugById.get(row.category_id ?? null);
        if (!slug || !row.recorded_at) continue;
        if (!result[slug]) result[slug] = [];
        result[slug].push({ score: row.level_score, recordedAt: row.recorded_at });
    }
    return result;
}

export function useUserCategoryHistoryQuery(userId: string | undefined, since: string) {
    return useQuery({
        queryKey: queryKeys.userCategoryHistory(userId, since),
        queryFn: () => fetchUserCategoryHistory(userId!, since),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });
}
