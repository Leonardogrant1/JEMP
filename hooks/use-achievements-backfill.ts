import { backfillAchievements } from '@/lib/achievements-backfill';
import { storage } from '@/lib/storage';
import { useCurrentUser } from '@/providers/current-user-provider';
import { queryKeys } from '@/queries/query-keys';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

// Once per app session per user — the backfill itself is idempotent, this just avoids noise.
const attempted = new Set<string>();

function backfillFlagKey(userId: string) {
    return `achievements_backfill_done:${userId}`;
}

/**
 * Silently grants historical unlocks once per user. Gated by a persisted MMKV flag
 * (not "no achievement rows yet") because the award path can insert rows before the
 * user's first profile/achievements visit, which would otherwise starve the backfill
 * for existing users forever.
 */
export function useAchievementsBackfill() {
    const { profile } = useCurrentUser();
    const qc = useQueryClient();

    useEffect(() => {
        const userId = profile?.id;
        if (!userId) return;
        if (storage.getString(backfillFlagKey(userId)) || attempted.has(userId)) return;
        attempted.add(userId);
        const gender = profile?.gender === 'female' ? 'female' : 'male';
        backfillAchievements(userId, gender)
            .then(count => {
                storage.set(backfillFlagKey(userId), 'true');
                if (count > 0) qc.invalidateQueries({ queryKey: queryKeys.userAchievements(userId) });
            })
            .catch(err => console.warn('[achievements] backfill failed', err));
    }, [profile?.id, profile?.gender, qc]);
}
