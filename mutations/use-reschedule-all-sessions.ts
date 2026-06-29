import { getDow, shiftDate } from '@/helpers/date-helpers';
import { useInvalidate } from '@/queries/use-invalidate';
import { supabase } from '@/services/supabase/client';
import { useMutation } from '@tanstack/react-query';

type RescheduleAllSessionsParams = {
    originalScheduledAt: string; // to determine original day of week
    newDate: string;             // YYYY-MM-DD — to determine new day of week
};

async function rescheduleAllSessions({ originalScheduledAt, newDate }: RescheduleAllSessionsParams) {
    const originalDow = getDow(originalScheduledAt);
    const newDow = getDow(newDate);
    const dayDiff = newDow - originalDow;

    if (dayDiff === 0) return;

    const { data: sessions, error } = await supabase
        .from('workout_sessions')
        .select('id, scheduled_at')
        .eq('status', 'scheduled');

    if (error) throw error;
    if (!sessions?.length) return;

    const toUpdate = sessions.filter(s => getDow(s.scheduled_at!) === originalDow);
    if (!toUpdate.length) return;

    await Promise.all(
        toUpdate.map(s =>
            supabase
                .from('workout_sessions')
                .update({ scheduled_at: shiftDate(s.scheduled_at!, dayDiff) })
                .eq('id', s.id)
        )
    );
}

export function useRescheduleAllSessions() {
    const { invalidatePlan } = useInvalidate();

    return useMutation({
        mutationFn: rescheduleAllSessions,
        onSuccess: async () => {
            await invalidatePlan();
        },
    });
}
