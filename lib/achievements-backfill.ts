import { computeNewUnlocks } from '@/lib/achievements';
import { supabase } from '@/services/supabase/client';

/**
 * Grants historical unlocks from existing metric entries. Chronological replay:
 * entries are walked oldest-first so each unlock keeps the timestamp of the
 * result that actually earned it. Idempotent via the (user_id, achievement_slug)
 * unique constraint + ignoreDuplicates.
 * Returns the number of inserted unlock rows.
 */
export async function backfillAchievements(userId: string, gender: 'male' | 'female'): Promise<number> {
    const { data, error } = await supabase
        .from('metric_entries')
        .select(`
            value,
            created_at,
            user_assessment:user_assessments!inner (
                assessment:assessments!inner ( slug )
            )
        `)
        .eq('user_id', userId)
        .eq('source_type', 'assessment');
    if (error) throw error;

    const entries = (data ?? [])
        .map(row => ({
            slug: (row.user_assessment as any)?.assessment?.slug as string | undefined,
            value: row.value == null ? null : Number(row.value),
            createdAt: row.created_at as string,
        }))
        .filter((e): e is { slug: string; value: number; createdAt: string } => !!e.slug && e.value !== null)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const unlocked = new Set<string>();
    const rows: { user_id: string; achievement_slug: string; value: number; unlocked_at: string }[] = [];
    for (const entry of entries) {
        const defs = computeNewUnlocks({
            assessmentSlug: entry.slug,
            value: entry.value,
            gender,
            alreadyUnlocked: unlocked,
        });
        for (const def of defs) {
            unlocked.add(def.slug);
            rows.push({
                user_id: userId,
                achievement_slug: def.slug,
                value: entry.value,
                unlocked_at: entry.createdAt,
            });
        }
    }

    if (rows.length === 0) return 0;

    const { error: insertError } = await supabase
        .from('user_achievements')
        .upsert(rows, { onConflict: 'user_id,achievement_slug', ignoreDuplicates: true });
    if (insertError) throw insertError;

    return rows.length;
}
