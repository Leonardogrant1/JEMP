import { supabase } from '@/services/supabase/client';
import { useInvalidate } from '@/queries/use-invalidate';
import { useMutation } from '@tanstack/react-query';

type RescheduleSessionParams = {
    sessionId: string;
    newDate: string; // ISO date string "YYYY-MM-DD"
    originalScheduledAt: string; // full ISO timestamp - to preserve the time component
};

async function rescheduleSession({
    sessionId,
    newDate,
    originalScheduledAt,
}: RescheduleSessionParams) {
    // Extract everything after the date (time + timezone) from original scheduled_at
    const timeSuffix = originalScheduledAt.slice(10); // "T10:00:00+00:00" or "T10:00:00Z"
    if (!timeSuffix.startsWith('T')) {
        throw new Error('Invalid originalScheduledAt format');
    }

    // Combine new date with original time + timezone
    const newScheduledAt = `${newDate}${timeSuffix}`;

    const { data, error } = await supabase
        .from('workout_sessions')
        .update({ scheduled_at: newScheduledAt })
        .eq('id', sessionId)
        .select('id, scheduled_at')
        .single();

    if (error) throw error;
    return data;
}

export function useRescheduleSession() {
    const { invalidatePlan } = useInvalidate();

    return useMutation({
        mutationFn: rescheduleSession,
        onSuccess: async () => {
            await invalidatePlan();
        },
    });
}
