import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type PendingSet = {
    workout_session_id: string;
    workout_session_block_id: string;
    workout_session_block_exercise_id: string;
    set_number: number;
    side: string;
    performed_reps: number | null;
    performed_duration_seconds: number | null;
    performed_load_value: number | null;
    performed_rpe: number | null;
    performed_distance_meters: number | null;
};

type ActiveSessionState = {
    sessionId: string | null;
    exerciseIdx: number;
    currentSet: number;
    pendingSets: PendingSet[];
};

type ActiveSessionActions = {
    initSession: (sessionId: string, exerciseIdx: number, currentSet: number) => void;
    setProgress: (exerciseIdx: number, currentSet: number) => void;
    logSets: (sets: PendingSet[]) => void;
    clear: () => void;
};

const INITIAL: ActiveSessionState = {
    sessionId: null,
    exerciseIdx: 0,
    currentSet: 1,
    pendingSets: [],
};

export const useActiveSessionStore = create<ActiveSessionState & ActiveSessionActions>()(
    persist(
        (set) => ({
            ...INITIAL,

            initSession: (sessionId, exerciseIdx, currentSet) =>
                set(state => {
                    // If resuming the same session, keep existing pending sets
                    if (state.sessionId === sessionId) {
                        return { exerciseIdx, currentSet };
                    }
                    // New session — reset everything
                    return { sessionId, exerciseIdx, currentSet, pendingSets: [] };
                }),

            setProgress: (exerciseIdx, currentSet) =>
                set({ exerciseIdx, currentSet }),

            logSets: (sets) =>
                set(state => ({
                    pendingSets: [
                        // Replace any existing record for same (exercise_id, set_number, side)
                        ...state.pendingSets.filter(
                            existing => !sets.some(
                                s =>
                                    s.workout_session_block_exercise_id === existing.workout_session_block_exercise_id &&
                                    s.set_number === existing.set_number &&
                                    s.side === existing.side
                            )
                        ),
                        ...sets,
                    ],
                })),

            clear: () => set(INITIAL),
        }),
        {
            name: 'active-session',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
