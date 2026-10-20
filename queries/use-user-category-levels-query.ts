import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

export type CategoryLevelMeta = { level: number; source: 'self_estimate' | 'measured'; measuredAt: string | null };

async function fetchUserCategoryLevels(userId: string): Promise<Record<string, number> & { __meta?: Record<string, CategoryLevelMeta> }> {
    const { data, error } = await supabase
        .from('user_category_levels')
        .select(`
            level_score, source, measured_at,
            category:categories ( slug )
        `)
        .eq('user_id', userId);

    if (error) throw error;

    // Slug → Level wie bisher; Meta (Quelle/Zeitstempel) separat unter __meta,
    // damit bestehende Slug-Lookups unverändert funktionieren.
    const result: Record<string, number> & { __meta?: Record<string, CategoryLevelMeta> } = {};
    const meta: Record<string, CategoryLevelMeta> = {};
    for (const row of data ?? []) {
        const slug = (row.category as any)?.slug;
        if (!slug) continue;
        result[slug] = row.level_score;
        meta[slug] = { level: row.level_score, source: (row as any).source ?? 'self_estimate', measuredAt: (row as any).measured_at ?? null };
    }
    result.__meta = meta as any;
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
