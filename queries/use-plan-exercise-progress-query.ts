import { loadUnit } from '@/helpers/format';
import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

export type ExerciseProgress = {
    exerciseId: string;
    name: string;
    metric: 'load' | 'reps' | 'duration';
    unit: string; // 'kg', '% 1RM', 's', '' — reps get their label in the UI
    first: number;
    last: number;
    percent: number | null; // null when first === 0
};

type SessionBest = {
    date: string;
    load: number | null;
    reps: number | null;
    duration: number | null;
};

// Only actual training blocks count as progress — warmup/cooldown mobility
// work would drown out the meaningful improvements
const PROGRESS_BLOCK_TYPES = new Set(['primary', 'secondary', 'accessory']);

/**
 * Per-exercise progression across a plan, computed from the logged sets:
 * best set of the first session vs. best set of the last session the
 * exercise was performed in. Only exercises trained in ≥2 sessions count.
 */
async function fetchPlanExerciseProgress(planId: string): Promise<ExerciseProgress[]> {
    const { data, error } = await supabase
        .from('workout_session_performed_sets')
        .select(`
            performed_reps, performed_load_value, performed_duration_seconds,
            workout_sessions!inner ( id, workout_plan_id, scheduled_at ),
            workout_session_block_exercises!inner (
                target_load_type,
                exercise:exercises ( id, name ),
                workout_session_blocks!inner ( block_type:block_types ( slug ) )
            )
        `)
        .eq('workout_sessions.workout_plan_id', planId);

    if (error) throw error;

    // Group: exercise → session → best values of that session
    const byExercise = new Map<string, {
        name: string;
        loadType: string | null;
        sessions: Map<string, SessionBest>;
    }>();

    for (const row of data ?? []) {
        const session = row.workout_sessions;
        const exercise = row.workout_session_block_exercises?.exercise;
        const blockType = row.workout_session_block_exercises?.workout_session_blocks?.block_type?.slug;
        if (!session?.scheduled_at || !exercise) continue;
        if (!blockType || !PROGRESS_BLOCK_TYPES.has(blockType)) continue;

        let entry = byExercise.get(exercise.id);
        if (!entry) {
            entry = { name: exercise.name, loadType: row.workout_session_block_exercises.target_load_type, sessions: new Map() };
            byExercise.set(exercise.id, entry);
        }

        let best = entry.sessions.get(session.id);
        if (!best) {
            best = { date: session.scheduled_at, load: null, reps: null, duration: null };
            entry.sessions.set(session.id, best);
        }
        if (row.performed_load_value !== null) best.load = Math.max(best.load ?? 0, row.performed_load_value);
        if (row.performed_reps !== null) best.reps = Math.max(best.reps ?? 0, row.performed_reps);
        if (row.performed_duration_seconds !== null) best.duration = Math.max(best.duration ?? 0, row.performed_duration_seconds);
    }

    const results: ExerciseProgress[] = [];

    for (const [exerciseId, { name, loadType, sessions }] of byExercise) {
        const ordered = [...sessions.values()].sort((a, b) => a.date.localeCompare(b.date));
        if (ordered.length < 2) continue;

        // Pick the most meaningful metric this exercise was logged with;
        // bodyweight exercises log load 0, so real load must be > 0 somewhere
        const metric: ExerciseProgress['metric'] =
            ordered.some(s => s.load !== null && s.load > 0) ? 'load'
                : ordered.some(s => s.reps !== null) ? 'reps'
                    : 'duration';

        const valueOf = (s: SessionBest) =>
            metric === 'load' ? s.load : metric === 'reps' ? s.reps : s.duration;

        const firstSession = ordered.find(s => valueOf(s) !== null);
        const lastSession = [...ordered].reverse().find(s => valueOf(s) !== null);
        if (!firstSession || !lastSession || firstSession === lastSession) continue;

        const first = valueOf(firstSession)!;
        const last = valueOf(lastSession)!;

        results.push({
            exerciseId,
            name,
            metric,
            unit: metric === 'load' ? loadUnit(loadType) : metric === 'duration' ? 's' : '',
            first,
            last,
            percent: first > 0 ? Math.round(((last - first) / first) * 100) : null,
        });
    }

    // Biggest improvements first
    return results.sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0));
}

export function usePlanExerciseProgressQuery(planId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.planExerciseProgress(planId),
        queryFn: () => fetchPlanExerciseProgress(planId!),
        enabled: !!planId,
        staleTime: 5 * 60 * 1000,
    });
}
