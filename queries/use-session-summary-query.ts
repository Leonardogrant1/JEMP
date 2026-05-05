import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

 
async function fetchSessionSummary(id: string) {
    const { data } = await supabase
        .from('workout_sessions')
        .select(`
            id, name, session_type, status, started_at, completed_at, estimated_duration_minutes,
            workout_session_blocks (
                id, order_index,
                block_type:block_types ( slug ),
                workout_session_block_exercises (
                    id, order_index,
                    target_sets, target_reps_min, target_reps_max,
                    target_load_type, target_load_value, target_rest_seconds,
                    exercise:exercises ( id, name, body_region ),
                    workout_session_performed_sets (
                        set_number, side, performed_reps, performed_load_value,
                        performed_rpe, performed_duration_seconds
                    )
                )
            )
        `)
        .eq('id', id)
        .single();

    if (!data) return null;

    const blocks = (data.workout_session_blocks ?? [])
        .map((b) => ({
            id: b.id,
            order_index: b.order_index,
            block_type: b.block_type,
            exercises: (b.workout_session_block_exercises ?? [])
                .map((ex) => ({
                    ...ex,
                    performed_sets: (ex.workout_session_performed_sets ?? [])
                        .sort((a, b) => a.set_number - b.set_number || (a.side ?? '').localeCompare(b.side ?? '')),
                }))
                .sort((a, b) => a.order_index - b.order_index),
        }))
        .sort((a, b) => a.order_index - b.order_index);

    return { ...data, blocks };
}

export function useSessionSummaryQuery(id: string | undefined) {
    return useQuery({
        queryKey: queryKeys.sessionSummary(id),
        queryFn: () => fetchSessionSummary(id!),
        enabled: !!id,
        staleTime: 10 * 60 * 1000,
    });
}
