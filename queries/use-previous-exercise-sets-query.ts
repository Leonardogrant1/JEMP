import { type PerformedSet } from '@/helpers/progression-suggestion';
import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

// Fenster für die Suche nach der letzten geloggten Ausführung: die Suche läuft
// über die eigenen Sessions (RLS/user_id-Index) statt — wie vorher — über alle
// wsbe-Zeilen dieser Übung ALLER User (PostgREST-Embed-Filter = Seq-Scan-Falle,
// Prod Ø 2s bei 40k Calls). Älter als 30 abgeschlossene Sessions ist eine
// Progression-Suggestion ohnehin nicht mehr aussagekräftig.
const COMPLETED_SESSION_WINDOW = 30;

async function fetchPreviousExerciseSets(
    exerciseId: string,
    currentSessionId: string,
): Promise<PerformedSet[] | null> {
    // Step 1: letzte abgeschlossene Sessions des Users, jüngste zuerst
    const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('status', 'completed')
        .neq('id', currentSessionId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(COMPLETED_SESSION_WINDOW);

    if (sessionsError || !sessions?.length) return null;
    const sessionIds = sessions.map(s => s.id);

    // Step 2: geloggte Sätze dieser Übung innerhalb des Fensters. Der Filter
    // auf der Embedded-Tabelle ist hier unkritisch, weil der äußere
    // .in('workout_session_id', …)-Filter hochselektiv und indexiert ist.
    const { data: sets, error: setsError } = await supabase
        .from('workout_session_performed_sets')
        .select(`
            set_number, performed_reps, performed_load_value, performed_duration_seconds,
            workout_session_id, workout_session_block_exercise_id,
            workout_session_block_exercises!inner ( exercise_id )
        `)
        .in('workout_session_id', sessionIds)
        .eq('workout_session_block_exercises.exercise_id', exerciseId);

    if (setsError || !sets?.length) return null;

    // Step 3: jüngste Session mit geloggten Sätzen wählen (Reihenfolge aus
    // Step 1) und auf eine block_exercise-Zeile eingrenzen — wie vorher, als
    // die Sätze genau einer wsbe-Zeile geladen wurden.
    const setsBySession = new Map<string, typeof sets>();
    for (const set of sets) {
        const list = setsBySession.get(set.workout_session_id) ?? [];
        list.push(set);
        setsBySession.set(set.workout_session_id, list);
    }
    const recentSets = sessionIds.map(id => setsBySession.get(id)).find(list => list?.length);
    if (!recentSets?.length) return null;

    const blockExerciseId = recentSets[0].workout_session_block_exercise_id;
    return recentSets
        .filter(s => s.workout_session_block_exercise_id === blockExerciseId)
        .sort((a, b) => a.set_number - b.set_number)
        .map(({ set_number, performed_reps, performed_load_value, performed_duration_seconds }) => ({
            set_number, performed_reps, performed_load_value, performed_duration_seconds,
        }));
}

export function usePreviousExerciseSetsQuery(
    exerciseId: string | undefined,
    currentSessionId: string | undefined,
) {
    return useQuery({
        queryKey: queryKeys.previousExerciseSets(exerciseId, currentSessionId),
        queryFn: () => fetchPreviousExerciseSets(exerciseId!, currentSessionId!),
        enabled: !!exerciseId && !!currentSessionId,
        staleTime: 5 * 60 * 1000,
    });
}
