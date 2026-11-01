import type { StrippableSession } from '@/lib/injury-constraints';
import { selectStrippable } from '@/lib/injury-constraints';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useInvalidate } from '@/queries/use-invalidate';
import { supabase } from '@/services/supabase/client';
import { useMutation } from '@tanstack/react-query';

// Strip-on-Change (Task 6, Spec §5): wenn ein Constraint neu auf `block`
// gesetzt oder von `light_only`/`ok` auf `block` verschärft wird, müssen
// bereits geplante (zukünftige) Sessions des aktiven Plans die betroffenen
// Übungen verlieren — sonst zeigt der Plan weiterhin eine gerade erst
// ausgeschlossene Übung. blockedTagIds sind contraindication_tags.id (nicht
// Slug), passend zur FK-Spalte in exercise_contraindications.
//
// Fail-closed wie bei lib/injury-constraints.ts: kein Supabase-Fehler wird
// stillschweigend verschluckt — ein verschluckter Fehler sähe hier wie
// "nichts zu entfernen" aus und ließe eine blockierte Übung im Plan stehen.
export async function stripInjuryViolations(blockedTagIds: string[]): Promise<{ removedExercises: number; removedBlocks: number }> {
    if (blockedTagIds.length === 0) return { removedExercises: 0, removedBlocks: 0 };

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No auth session');
    const userId = session.user.id;

    // 0) aktiver Plan — kein aktiver Plan, nichts zu tun.
    const { data: plan, error: planError } = await supabase
        .from('workout_plans')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();
    if (planError) throw planError;
    if (!plan) return { removedExercises: 0, removedBlocks: 0 };

    // 1) blockierte exercise_ids via exercise_contraindications ∩ blockedTagIds
    const { data: contraRows, error: contraError } = await supabase
        .from('exercise_contraindications')
        .select('exercise_id')
        .in('contraindication_tag_id', blockedTagIds);
    if (contraError) throw contraError;
    const blockedExerciseIds = new Set((contraRows ?? []).map((r) => r.exercise_id));
    if (blockedExerciseIds.size === 0) return { removedExercises: 0, removedBlocks: 0 };

    // 2) ZUKÜNFTIGE (scheduled) Sessions des aktiven Plans inkl. Blocks/Exercises —
    // in_progress/completed/skipped/cancelled werden erst gar nicht geladen.
    const { data: sessionRows, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id, status, workout_session_blocks(id, workout_session_block_exercises(id, exercise_id))')
        .eq('workout_plan_id', plan.id)
        .eq('status', 'scheduled');
    if (sessionsError) throw sessionsError;

    const sessions: StrippableSession[] = (sessionRows ?? []).map((s) => ({
        id: s.id,
        status: s.status as StrippableSession['status'],
        blocks: (s.workout_session_blocks ?? []).map((b) => ({
            id: b.id,
            exercises: (b.workout_session_block_exercises ?? []).map((e) => ({ id: e.id, exercise_id: e.exercise_id })),
        })),
    }));

    const allBlockExerciseIds = sessions.flatMap((s) => s.blocks.flatMap((b) => b.exercises.map((e) => e.id)));
    if (allBlockExerciseIds.length === 0) return { removedExercises: 0, removedBlocks: 0 };

    // 3) Lock-Check (Muster aus mutations/use-swap-exercise.ts:17-22): Zeilen
    // mit geloggten Sätzen sind nie antastbar, selbst wenn ihre Exercise
    // blockiert ist (Review Focus 4).
    const { data: performedRows, error: performedError } = await supabase
        .from('workout_session_performed_sets')
        .select('workout_session_block_exercise_id')
        .in('workout_session_block_exercise_id', allBlockExerciseIds);
    if (performedError) throw performedError;
    const performedSetCounts: Record<string, number> = {};
    for (const row of performedRows ?? []) {
        performedSetCounts[row.workout_session_block_exercise_id] =
            (performedSetCounts[row.workout_session_block_exercise_id] ?? 0) + 1;
    }

    const { exerciseIdsToDelete, blockIdsToDelete, removedExercises, removedBlocks } = selectStrippable(
        sessions,
        blockedExerciseIds,
        performedSetCounts,
    );

    // Exercises zuerst löschen, dann die geleerten Blocks — vermeidet jede
    // Abhängigkeit von ON DELETE CASCADE-Semantik zwischen beiden Tabellen.
    if (exerciseIdsToDelete.length > 0) {
        const { error: deleteExercisesError } = await supabase
            .from('workout_session_block_exercises')
            .delete()
            .in('id', exerciseIdsToDelete);
        if (deleteExercisesError) throw deleteExercisesError;
    }

    if (blockIdsToDelete.length > 0) {
        const { error: deleteBlocksError } = await supabase
            .from('workout_session_blocks')
            .delete()
            .in('id', blockIdsToDelete);
        if (deleteBlocksError) throw deleteBlocksError;
    }

    trackerManager.track('injury_strip_applied', { removedExercises, removedBlocks });

    return { removedExercises, removedBlocks };
}

export function useStripInjuryViolations() {
    const { invalidatePlan, invalidateSessionDetail } = useInvalidate();

    return useMutation({
        mutationFn: stripInjuryViolations,
        onSuccess: async () => {
            await Promise.all([invalidatePlan(), invalidateSessionDetail()]);
        },
    });
}
