import { supabase } from '@/services/supabase/client';
import { useInvalidate } from '@/queries/use-invalidate';
import { useMutation } from '@tanstack/react-query';
import type { SwapAlternative } from '@/lib/fetch-swap-alternatives';
import type { TablesUpdate } from '@/database.types';

export type SwapScope = 'this_session' | 'this_and_future';

async function swapExercise(input: {
    sessionId: string; blockExerciseId: string;
    planBlockExerciseId: string | null;
    scheduledAt: string; currentExerciseId: string;
    alternative: SwapAlternative; scope: SwapScope;
}) {
    // Sperre (Spec §4): Zeilen mit geloggten Sätzen sind nie tauschbar —
    // die UI graut aus, hier die harte zweite Verteidigungslinie.
    const { count: performed, error: lockError } = await supabase
        .from('workout_session_performed_sets')
        .select('id', { count: 'exact', head: true })
        .eq('workout_session_block_exercise_id', input.blockExerciseId);
    if (lockError) throw lockError;
    if ((performed ?? 0) > 0) throw new Error('swap_blocked_logged_sets');

    // Kein `notes`-Feld hier: das existiert nur auf workout_plan_session_block_exercises,
    // nicht auf dieser Session-Instanz-Tabelle — würde als Update-Patch einen Postgres-Fehler werfen.
    const patch: TablesUpdate<'workout_session_block_exercises'> = {
        exercise_id: input.alternative.exercise.id,
        swapped_from_exercise_id: input.currentExerciseId,
        ...input.alternative.prescription,
        target_load_type: input.alternative.prescription.target_load_type as TablesUpdate<'workout_session_block_exercises'>['target_load_type'],
        recommended_load_value: null,
    };

    if (input.scope === 'this_session' || !input.planBlockExerciseId) {
        const { error } = await supabase
            .from('workout_session_block_exercises').update(patch).eq('id', input.blockExerciseId);
        if (error) throw error;
        return;
    }
    // Alle zukünftigen Occurrences derselben Blueprint-Übung (scheduled/in_progress).
    const { data: siblings, error: selError } = await supabase
        .from('workout_session_block_exercises')
        .select('id, workout_session_blocks!inner(workout_sessions!inner(scheduled_at, status))')
        .eq('workout_plan_session_block_exercise_id', input.planBlockExerciseId)
        .gte('workout_session_blocks.workout_sessions.scheduled_at', input.scheduledAt)
        .in('workout_session_blocks.workout_sessions.status', ['scheduled', 'in_progress']);
    if (selError) throw selError;
    const siblingIds = (siblings ?? []).map(s => s.id);

    // Zweite Sperre-Prüfung für Geschwister-Zeilen (Finding 1): die Sperre
    // oben greift nur für die Referenzzeile. Eine Sibling-Occurrence kann
    // aber selbst schon geloggte Sätze haben (z.B. eine zwischenzeitlich
    // begonnene/gestartete künftige Session) — die darf trotz `this_and_future`
    // nicht überschrieben werden, sonst zeigt die Historie nachträglich
    // Sätze einer anderen Übung, als tatsächlich geloggt wurde.
    let lockedSiblingIds = new Set<string>();
    if (siblingIds.length > 0) {
        const { data: lockedRows, error: lockedError } = await supabase
            .from('workout_session_performed_sets')
            .select('workout_session_block_exercise_id')
            .in('workout_session_block_exercise_id', siblingIds);
        if (lockedError) throw lockedError;
        lockedSiblingIds = new Set((lockedRows ?? []).map((r) => r.workout_session_block_exercise_id));
    }

    const ids = [...new Set([input.blockExerciseId, ...siblingIds.filter((id) => !lockedSiblingIds.has(id))])];
    const { error } = await supabase
        .from('workout_session_block_exercises').update(patch).in('id', ids);
    if (error) throw error;
}

export function useSwapExercise() {
    const { invalidatePlan, invalidateSessionDetail } = useInvalidate();
    return useMutation({
        mutationFn: swapExercise,
        onSuccess: async (_, input) => {
            await invalidateSessionDetail(input.sessionId);
            // `this_and_future` ändert auch andere Sessions + die Plan-Übersicht
            // (Finding 5) — der Cache dieser Session alleine reicht nicht.
            if (input.scope === 'this_and_future') {
                await Promise.all([invalidatePlan(), invalidateSessionDetail()]);
            }
        },
    });
}
