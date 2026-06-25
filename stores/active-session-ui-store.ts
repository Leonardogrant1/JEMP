import { create } from 'zustand';
import type { SessionDetail } from '@/queries/use-session-detail-query';

// ── Types ────────────────────────────────────────────────────────────────────

export type FlatExercise = {
    id: string;
    blockId: string;
    blockType: { slug: string } | null;
    exercise: {
        id: string;
        name: string;
        body_region: string | null;
        movement_pattern: string | null;
        youtube_url: string | null;
        thumbnail_storage_path: string | null;
        video_storage_path: string | null;
        is_unilateral: boolean;
        measurement_type: string;
        equipment: { slug: string; name_i18n: Record<string, string> | null }[];
    };
    target_sets: number | null;
    target_reps_min: number | null;
    target_reps_max: number | null;
    target_duration_seconds: number | null;
    target_rest_seconds: number | null;
    target_load_type: string | null;
    target_load_value: number | null;
};

type PreviousSet = { reps: string; load: string; repsRight?: string };

// ── State ─────────────────────────────────────────────────────────────────────

type ActiveSessionUIState = {
    // Server data
    session: SessionDetail | null;
    allExercises: FlatExercise[];

    // Input fields
    reps: string;
    load: string;
    repsLeft: string;
    repsRight: string;
    loadLeft: string;
    loadRight: string;

    // Display
    previousSet: PreviousSet | null;
    suggestionHint: string | null;

    // Rest timer
    restSeconds: number;
    totalRestSeconds: number;
    isResting: boolean;

    // Exercise timer — bilateral
    exerciseDuration: number;
    exerciseTimerActive: boolean;

    // Exercise timer — unilateral
    exerciseDurationLeft: number;
    exerciseDurationRight: number;
    exerciseTimerActiveSide: 'left' | 'right' | null;

    // UI flow
    initialized: boolean;
    isCompleting: boolean;
    showCongrats: boolean;
};

// ── Actions ───────────────────────────────────────────────────────────────────

type ActiveSessionUIActions = {
    setSession: (session: SessionDetail, allExercises: FlatExercise[]) => void;

    setReps: (v: string) => void;
    setLoad: (v: string) => void;
    setRepsLeft: (v: string) => void;
    setRepsRight: (v: string) => void;
    setLoadLeft: (v: string) => void;
    setLoadRight: (v: string) => void;

    setPreviousSet: (v: PreviousSet | null) => void;
    setSuggestionHint: (v: string | null) => void;

    setRestSeconds: (v: number | ((prev: number) => number)) => void;
    setTotalRestSeconds: (v: number | ((prev: number) => number)) => void;
    setIsResting: (v: boolean) => void;

    setExerciseDuration: (v: number | ((prev: number) => number)) => void;
    setExerciseTimerActive: (v: boolean) => void;

    setExerciseDurationLeft: (v: number | ((prev: number) => number)) => void;
    setExerciseDurationRight: (v: number | ((prev: number) => number)) => void;
    setExerciseTimerActiveSide: (v: 'left' | 'right' | null) => void;

    setInitialized: (v: boolean) => void;
    setIsCompleting: (v: boolean) => void;
    setShowCongrats: (v: boolean) => void;

    resetInputs: () => void;
    reset: () => void;
};

// ── Initial state ─────────────────────────────────────────────────────────────

const INITIAL: ActiveSessionUIState = {
    session: null,
    allExercises: [],
    reps: '',
    load: '',
    repsLeft: '',
    repsRight: '',
    loadLeft: '',
    loadRight: '',
    previousSet: null,
    suggestionHint: null,
    restSeconds: 0,
    totalRestSeconds: 0,
    isResting: false,
    exerciseDuration: 0,
    exerciseTimerActive: false,
    exerciseDurationLeft: 0,
    exerciseDurationRight: 0,
    exerciseTimerActiveSide: null,
    initialized: false,
    isCompleting: false,
    showCongrats: false,
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useActiveSessionUIStore = create<ActiveSessionUIState & ActiveSessionUIActions>()(
    (set) => ({
        ...INITIAL,

        setSession: (session, allExercises) => set({ session, allExercises }),

        setReps: (reps) => set({ reps }),
        setLoad: (load) => set({ load }),
        setRepsLeft: (repsLeft) => set({ repsLeft }),
        setRepsRight: (repsRight) => set({ repsRight }),
        setLoadLeft: (loadLeft) => set({ loadLeft }),
        setLoadRight: (loadRight) => set({ loadRight }),

        setPreviousSet: (previousSet) => set({ previousSet }),
        setSuggestionHint: (suggestionHint) => set({ suggestionHint }),

        setRestSeconds: (v) =>
            set(s => ({ restSeconds: typeof v === 'function' ? v(s.restSeconds) : v })),
        setTotalRestSeconds: (v) =>
            set(s => ({ totalRestSeconds: typeof v === 'function' ? v(s.totalRestSeconds) : v })),
        setIsResting: (isResting) => set({ isResting }),

        setExerciseDuration: (v) =>
            set(s => ({ exerciseDuration: typeof v === 'function' ? v(s.exerciseDuration) : v })),
        setExerciseTimerActive: (exerciseTimerActive) => set({ exerciseTimerActive }),

        setExerciseDurationLeft: (v) =>
            set(s => ({ exerciseDurationLeft: typeof v === 'function' ? v(s.exerciseDurationLeft) : v })),
        setExerciseDurationRight: (v) =>
            set(s => ({ exerciseDurationRight: typeof v === 'function' ? v(s.exerciseDurationRight) : v })),
        setExerciseTimerActiveSide: (exerciseTimerActiveSide) => set({ exerciseTimerActiveSide }),

        setInitialized: (initialized) => set({ initialized }),
        setIsCompleting: (isCompleting) => set({ isCompleting }),
        setShowCongrats: (showCongrats) => set({ showCongrats }),

        resetInputs: () => set({
            reps: '', load: '', repsLeft: '', repsRight: '', loadLeft: '', loadRight: '',
            exerciseDuration: 0, exerciseTimerActive: false,
            exerciseDurationLeft: 0, exerciseDurationRight: 0, exerciseTimerActiveSide: null,
        }),

        reset: () => set(INITIAL),
    })
);
