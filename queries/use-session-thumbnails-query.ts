import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

/**
 * Remote session thumbnails per image group, as full public URLs.
 * Empty map when nothing is configured — callers fall back to bundled images.
 */
export function useSessionThumbnailsQuery() {
    return useQuery({
        queryKey: queryKeys.sessionThumbnails,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('session_thumbnails')
                .select('image_group, storage_path');
            if (error) throw error;
            const map: Record<string, string> = {};
            for (const row of data) {
                if (!row.storage_path) continue;
                map[row.image_group] = supabase.storage
                    .from('session-thumbnails')
                    .getPublicUrl(row.storage_path).data.publicUrl;
            }
            return map;
        },
        staleTime: 60 * 60 * 1000,
    });
}
