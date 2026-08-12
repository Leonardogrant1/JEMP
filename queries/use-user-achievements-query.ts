import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

export type UserAchievementRow = {
    achievement_slug: string;
    unlocked_at: string;
    value: number | null;
};

async function fetchUserAchievements(userId: string): Promise<UserAchievementRow[]> {
    const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_slug, unlocked_at, value')
        .eq('user_id', userId);
    if (error) throw error;
    return data ?? [];
}

export function useUserAchievementsQuery(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.userAchievements(userId),
        queryFn: () => fetchUserAchievements(userId!),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });
}
