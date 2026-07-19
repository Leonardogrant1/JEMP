import { useInvalidate } from '@/queries/use-invalidate';
import { supabase } from '@/services/supabase/client';
import { useMutation } from '@tanstack/react-query';

type AdjustRestTimesParams = {
    sessionId: string;
    workoutPlanSessionId: string | null;
    restAdjustSeconds: number | null; // null = reset to recommended
    scope: 'single' | 'all';
};

async function adjustRestTimes({ sessionId, workoutPlanSessionId, restAdjustSeconds, scope }: AdjustRestTimesParams) {
    // Always update the session itself (it may already be in progress,
    // so the status filter below would miss it)
    const { error } = await supabase
        .from('workout_sessions')
        .update({ rest_adjust_seconds: restAdjustSeconds })
        .eq('id', sessionId);

    if (error) throw error;

    if (scope === 'all' && workoutPlanSessionId) {
        const { error: bulkError } = await supabase
            .from('workout_sessions')
            .update({ rest_adjust_seconds: restAdjustSeconds })
            .eq('workout_plan_session_id', workoutPlanSessionId)
            .eq('status', 'scheduled');

        if (bulkError) throw bulkError;
    }
}

export function useAdjustRestTimes() {
    const { invalidatePlan, invalidateSessionDetail } = useInvalidate();

    return useMutation({
        mutationFn: adjustRestTimes,
        onSuccess: async (_data, { sessionId }) => {
            await Promise.all([invalidatePlan(), invalidateSessionDetail(sessionId)]);
        },
    });
}
