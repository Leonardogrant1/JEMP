import { getTrainingAnimation } from '@/constants/training-animations';
import { queryKeys } from '@/queries/query-keys';
import { useSportGroupAnimationQuery } from '@/queries/use-sport-group-animation-query';
import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Directory, File, Paths } from 'expo-file-system';
import { useEffect, useState } from 'react';

type AnimationSport = {
    animation_storage_path?: string | null;
    group_name?: string | null;
} | null | undefined;

const CACHE_DIR = 'sport-animations';

function cacheFile(path: string): File {
    return new File(new Directory(Paths.cache, CACHE_DIR), path.replace(/\//g, '_'));
}

/**
 * Lottie source for the training-day card with the fallback chain
 * sport → sport group → bundled mapping. Remote JSONs are downloaded once
 * into the cache directory; new uploads get fresh timestamped paths, so the
 * cache never goes stale.
 */
export function useTrainingAnimation(sport: AnimationSport): unknown {
    const sportPath = sport?.animation_storage_path ?? null;
    // The group fallback is only relevant while the sport itself has no animation
    const { data: groupPath } = useSportGroupAnimationQuery(sportPath ? undefined : sport?.group_name ?? undefined);
    const path = sportPath ?? groupPath ?? null;

    const [remote, setRemote] = useState<{ path: string; json: unknown } | null>(null);

    useEffect(() => {
        if (!path) return;
        let cancelled = false;
        (async () => {
            try {
                const dir = new Directory(Paths.cache, CACHE_DIR);
                if (!dir.exists) dir.create({ intermediates: true });
                const file = cacheFile(path);
                if (!file.exists) {
                    const url = supabase.storage.from('sport-animations').getPublicUrl(path).data.publicUrl;
                    await File.downloadFileAsync(url, file, { idempotent: true });
                }
                const json = JSON.parse(await file.text());
                if (!Array.isArray(json?.layers)) throw new Error('not a lottie file');
                if (!cancelled) setRemote({ path, json });
            } catch {
                // Broken download or invalid JSON — drop the cached file and stay on the bundled fallback
                try { cacheFile(path).delete(); } catch { /* file may not exist */ }
            }
        })();
        return () => { cancelled = true; };
    }, [path]);

    if (path && remote?.path === path) return remote.json;
    return getTrainingAnimation(sport?.group_name);
}

/**
 * Wie useTrainingAnimation, aber per Sport-Slug — für Kontexte ohne
 * aufgelöstes Sport-Objekt (z. B. Onboarding, wo der Sport noch nicht
 * im Profil gespeichert ist).
 */
export function useTrainingAnimationBySlug(slug: string | null | undefined): unknown {
    const { data } = useQuery({
        queryKey: queryKeys.sportAnimationMeta(slug ?? undefined),
        queryFn: async () => {
            const { data: row, error } = await supabase
                .from('sports')
                .select('animation_storage_path, group_name')
                .eq('slug', slug!)
                .maybeSingle();
            if (error) throw error;
            return row;
        },
        enabled: !!slug,
        staleTime: 60 * 60 * 1000,
    });
    return useTrainingAnimation(data ?? null);
}
