import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

/** Banner fallback for a sport group — used when the sport itself has no banner. */
export function useSportGroupBannerQuery(groupName: string | undefined) {
    return useQuery({
        queryKey: queryKeys.sportGroupBanner(groupName),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sport_group_banners')
                .select('banner_storage_path')
                .eq('group_name', groupName!)
                .maybeSingle();
            if (error) throw error;
            return data?.banner_storage_path ?? null;
        },
        enabled: !!groupName,
        staleTime: 60 * 60 * 1000,
    });
}
