import { supabase } from '@/services/supabase/client';
import { useInvalidate } from '@/queries/use-invalidate';
import { useMutation } from '@tanstack/react-query';
import type { Enums } from '@/database.types';

type SessionStatus = Enums<'session_status'>;

type UpdateSessionStatusParams = {
    sessionId: string;
    status: SessionStatus;
};

async function updateSessionStatus({ sessionId, status }: UpdateSessionStatusParams) {
    const updates: Record<string, any> = { status };

    if (status === 'in_progress') {
        updates.started_at = new Date().toISOString();
    } else if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
        .from('workout_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select('id, status')
        .single();

    if (error) throw error;
    return data;
}

export function useUpdateSessionStatus() {
    const { invalidatePlan, invalidateSessionDetail } = useInvalidate();

    return useMutation({
        mutationFn: updateSessionStatus,
        onSuccess: async (_data, { sessionId }) => {
            await Promise.all([
                invalidatePlan(),
                invalidateSessionDetail(sessionId),
            ]);
        },
    });
}
