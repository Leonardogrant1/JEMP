import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

const SESSION_DETAIL_SELECT = `
    id, name, description, session_type, scheduled_at, status, estimated_duration_minutes, current_exercise_index, current_set_number,
    workout_session_blocks (
        id, order_index,
        block_type:block_types ( slug ),
        focused_category:categories ( slug ),
        workout_session_block_exercises (
            id, order_index,
            target_sets, target_reps_min, target_reps_max,
            target_duration_seconds, target_rest_seconds,
            target_load_type, target_load_value,
            exercise:exercises ( id, name, body_region, movement_pattern, thumbnail_storage_path, youtube_url )
        )
    )
` as const;

async function fetchSessionDetail(id: string) {
    const { data } = await supabase
        .from('workout_sessions')
        .select(SESSION_DETAIL_SELECT)
        .eq('id', id)
        .single();

    if (!data) return null;

    const blocks = (data.workout_session_blocks ?? [])
        .map((b) => ({
            ...b,
            exercises: (b.workout_session_block_exercises ?? [])
                .sort((a, b) => a.order_index - b.order_index),
        }))
        .sort((a, b) => a.order_index - b.order_index);

    // Collect all exercise IDs, then fetch their equipment in one query
    const exerciseIds = blocks.flatMap(b => b.exercises.map(e => (e.exercise as any)?.id)).filter(Boolean) as string[];

    const { data: equipmentRows } = exerciseIds.length > 0
        ? await supabase
            .from('exercise_equipments')
            .select('exercise_id, equipment:equipments ( slug, name_i18n )')
            .in('exercise_id', exerciseIds)
        : { data: [] };

    // Map: exercise_id → equipment list
    const equipmentByExercise = new Map<string, { slug: string; name_i18n: Record<string, string> | null }[]>();
    for (const row of equipmentRows ?? []) {
        const eq = (row as any).equipment;
        if (!eq) continue;
        if (!equipmentByExercise.has(row.exercise_id)) equipmentByExercise.set(row.exercise_id, []);
        equipmentByExercise.get(row.exercise_id)!.push(eq);
    }

    // Attach equipment to each exercise
    const blocksWithEquipment = blocks.map(b => ({
        ...b,
        exercises: b.exercises.map(ex => ({
            ...ex,
            exercise: ex.exercise ? {
                ...(ex.exercise as any),
                equipment: equipmentByExercise.get((ex.exercise as any).id) ?? [],
            } : ex.exercise,
        })),
    }));

    return { ...data, blocks: blocksWithEquipment };
}

export type SessionDetail = NonNullable<Awaited<ReturnType<typeof fetchSessionDetail>>>;

export function useSessionDetailQuery(id: string | undefined) {
    return useQuery({
        queryKey: queryKeys.sessionDetail(id),
        queryFn: () => fetchSessionDetail(id!),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
}
