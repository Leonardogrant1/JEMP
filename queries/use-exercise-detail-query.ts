import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

async function fetchExerciseDetail(id: string) {
    const { data } = await supabase
        .from('exercises')
        .select(`
            id, name, slug, description, description_i18n, body_region, movement_pattern,
            min_level, max_level, youtube_url, thumbnail_storage_path, video_storage_path,
            category:categories ( slug ),
            exercise_equipments ( equipment:equipments ( slug, name_i18n ) ),
            exercise_blocks ( block_type:block_types ( slug ) )
        `)
        .eq('id', id)
        .single();

    if (!data) return null;

    const equipments = (data.exercise_equipments ?? [])
        .map((ee) => ee.equipment)
        .filter((e): e is { slug: string; name_i18n: unknown } => !!e?.slug);

    const block_types = (data.exercise_blocks ?? [])
        .map((eb) => eb.block_type?.slug)
        .filter((s): s is string => !!s);

    return { ...data, equipments, block_types };
}

export type ExerciseDetail = NonNullable<Awaited<ReturnType<typeof fetchExerciseDetail>>>;

export function useExerciseDetailQuery(id: string | undefined) {
    return useQuery({
        queryKey: queryKeys.exerciseDetail(id),
        queryFn: () => fetchExerciseDetail(id!),
        enabled: !!id,
        staleTime: 10 * 60 * 1000,
    });
}
