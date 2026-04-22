import { supabase } from '@/services/supabase/client';
import { useMutation } from '@tanstack/react-query';

type UpdateProgressParams = {
    sessionId: string;
    currentExerciseIndex: number;
    currentSetNumber: number;
};

async function updateSessionProgress({ sessionId, currentExerciseIndex, currentSetNumber }: UpdateProgressParams) {
    const { error } = await supabase
        .from('workout_sessions')
        .update({
            current_exercise_index: currentExerciseIndex,
            current_set_number: currentSetNumber,
        })
        .eq('id', sessionId);

    if (error) throw error;
}

export function useUpdateSessionProgress() {
    return useMutation({ mutationFn: updateSessionProgress });
}
