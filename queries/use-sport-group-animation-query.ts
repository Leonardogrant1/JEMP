import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

/** Training-animation fallback for a sport group — used when the sport itself has no animation. */
export function useSportGroupAnimationQuery(groupName: string | undefined) {
    return useQuery({
        queryKey: queryKeys.sportGroupAnimation(groupName),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sport_group_animations')
                .select('animation_storage_path')
                .eq('group_name', groupName!)
                .maybeSingle();
            if (error) throw error;
            return data?.animation_storage_path ?? null;
        },
        enabled: !!groupName,
        staleTime: 60 * 60 * 1000,
    });
}
