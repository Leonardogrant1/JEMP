import { type PerformedSet } from '@/helpers/progression-suggestion';
import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

async function fetchPreviousExerciseSets(
    exerciseId: string,
    currentSessionId: string,
): Promise<PerformedSet[] | null> {
    // Step 1: Find all block_exercise entries for this exercise across completed sessions
    const { data: blockExercises, error } = await supabase
        .from('workout_session_block_exercises')
        .select(`
            id,
            workout_session_blocks!inner (
                workout_sessions!inner ( id, status, completed_at )
            )
        `)
        .eq('exercise_id', exerciseId)
        .eq('workout_session_blocks.workout_sessions.status', 'completed')
        .neq('workout_session_blocks.workout_sessions.id', currentSessionId);

    if (error || !blockExercises?.length) return null;

    // Step 2: Find the most recent completed session client-side
    type BlockExWithSession = {
        id: string;
        workout_session_blocks: {
            workout_sessions: { id: string; status: string; completed_at: string | null };
        };
    };

    const sorted = (blockExercises as unknown as BlockExWithSession[])
        .filter(be => be.workout_session_blocks?.workout_sessions?.completed_at)
        .sort((a, b) => {
            const dateA = new Date(a.workout_session_blocks.workout_sessions.completed_at!).getTime();
            const dateB = new Date(b.workout_session_blocks.workout_sessions.completed_at!).getTime();
            return dateB - dateA;
        });

    if (!sorted.length) return null;

    const mostRecentBlockExerciseId = sorted[0].id;

    // Step 3: Fetch performed sets for that block exercise
    const { data: sets } = await supabase
        .from('workout_session_performed_sets')
        .select('set_number, performed_reps, performed_load_value, performed_duration_seconds')
        .eq('workout_session_block_exercise_id', mostRecentBlockExerciseId)
        .order('set_number', { ascending: true });

    if (!sets?.length) return null;

    return sets as PerformedSet[];
}

export function usePreviousExerciseSetsQuery(
    exerciseId: string | undefined,
    currentSessionId: string | undefined,
) {
    return useQuery({
        queryKey: queryKeys.previousExerciseSets(exerciseId, currentSessionId),
        queryFn: () => fetchPreviousExerciseSets(exerciseId!, currentSessionId!),
        enabled: !!exerciseId && !!currentSessionId,
        staleTime: 5 * 60 * 1000,
    });
}
