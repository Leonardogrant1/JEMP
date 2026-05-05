import type { TablesInsert } from '@/database.types';
import { supabase } from '@/services/supabase/client';
import { useInvalidate } from '@/queries/use-invalidate';
import { useMutation } from '@tanstack/react-query';

export type PerformedSetInput = TablesInsert<'workout_session_performed_sets'>;

async function upsertPerformedSets(sets: PerformedSetInput[]) {
    if (sets.length === 0) return [];

    const { data, error } = await supabase
        .from('workout_session_performed_sets')
        .upsert(sets, {
            onConflict: 'workout_session_block_exercise_id,set_number,side',
        })
        .select('id');

    if (error) throw error;
    return data;
}

export function useUpsertPerformedSets() {
    const { invalidateSessionDetail } = useInvalidate();

    return useMutation({
        mutationFn: upsertPerformedSets,
        onSuccess: async (_, sets) => {
            if (sets.length > 0) {
                await invalidateSessionDetail(sets[0].workout_session_id);
            }
        },
    });
}
