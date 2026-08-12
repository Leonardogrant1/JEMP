import { backfillAchievements } from '@/lib/achievements-backfill';
import { useCurrentUser } from '@/providers/current-user-provider';
import { queryKeys } from '@/queries/query-keys';
import { useUserAchievementsQuery } from '@/queries/use-user-achievements-query';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

// Once per app session per user — the backfill itself is idempotent, this just avoids noise.
const attempted = new Set<string>();

/** Silently grants historical unlocks when a user has results but no achievement rows yet. */
export function useAchievementsBackfill() {
    const { profile } = useCurrentUser();
    const qc = useQueryClient();
    const achievements = useUserAchievementsQuery(profile?.id);

    useEffect(() => {
        const userId = profile?.id;
        if (!userId || !achievements.isSuccess) return;
        if (achievements.data.length > 0 || attempted.has(userId)) return;
        attempted.add(userId);
        const gender = profile?.gender === 'female' ? 'female' : 'male';
        backfillAchievements(userId, gender)
            .then(count => {
                if (count > 0) qc.invalidateQueries({ queryKey: queryKeys.userAchievements(userId) });
            })
            .catch(err => console.warn('[achievements] backfill failed', err));
    }, [profile?.id, profile?.gender, achievements.isSuccess, achievements.data, qc]);
}
