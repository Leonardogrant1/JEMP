import { formatTimer } from '@/helpers/active-session-helpers';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useUpdateSessionStatus } from '@/mutations/use-update-session-status';
import { useUpsertPerformedSets } from '@/mutations/use-upsert-performed-set';
import { useActiveSessionTransition } from '@/providers/active-session-transition-provider';
import { useRestTimer } from '@/providers/rest-timer-provider';
import { useExerciseTimer } from '@/providers/timer-ref-provider';
import { useSessionDetailQuery } from '@/queries/use-session-detail-query';
import { useActiveSessionStore } from '@/stores/active-session-store';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { devLog } from '@/utils/dev-log';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Keyboard } from 'react-native';

/**
 * Komplette Log-Logik der Active Session — geteilt zwischen dem FAB
 * (Duration-Übungen loggen direkt) und dem LogSetSheet (Wheels + Bestätigen).
 */
export function useLogSet() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const { data: session } = useSessionDetailQuery(id);

    const { exerciseIdx, currentSet, setExerciseIdx, setCurrentSet, slideOutExercise, slideOutSet } = useActiveSessionTransition();
    const { start: startTimer } = useRestTimer();
    const {
        exerciseDuration, exerciseDurationLeft, exerciseDurationRight,
        stopExerciseTimer, stopExerciseTimerSide,
        setExerciseDuration, setExerciseDurationLeft, setExerciseDurationRight,
    } = useExerciseTimer();

    const store = useActiveSessionStore();
    const upsertSets = useUpsertPerformedSets();
    const updateStatus = useUpdateSessionStatus();

    const allExercises = useActiveSessionUIStore(s => s.allExercises);
    const isCompleting = useActiveSessionUIStore(s => s.isCompleting);
    const setIsCompleting = useActiveSessionUIStore(s => s.setIsCompleting);
    const setShowCongrats = useActiveSessionUIStore(s => s.setShowCongrats);

    const reps = useActiveSessionUIStore(s => s.reps);
    const load = useActiveSessionUIStore(s => s.load);
    const repsLeft = useActiveSessionUIStore(s => s.repsLeft);
    const repsRight = useActiveSessionUIStore(s => s.repsRight);
    const loadLeft = useActiveSessionUIStore(s => s.loadLeft);
    const loadRight = useActiveSessionUIStore(s => s.loadRight);
    const setReps = useActiveSessionUIStore(s => s.setReps);
    const setRepsLeft = useActiveSessionUIStore(s => s.setRepsLeft);
    const setRepsRight = useActiveSessionUIStore(s => s.setRepsRight);
    const setPreviousSet = useActiveSessionUIStore(s => s.setPreviousSet);
    const setShowExerciseComplete = useActiveSessionUIStore(s => s.setShowExerciseComplete);

    const current = allExercises[exerciseIdx] ?? null;
    const totalSets = current?.target_sets ?? 1;
    const isLastSet = currentSet >= totalSets;
    const isLastExercise = exerciseIdx === allExercises.length - 1;
    const isUnilateral = current?.exercise.laterality === 'unilateral';
    const isDuration = current?.exercise.measurement_type === 'duration';

    // Unilateral wird SEITENWEISE geloggt (links → Pause → rechts → Pause):
    // die aktive Seite ergibt sich aus den bereits geloggten Einträgen des Satzes
    const currentSetSides = current
        ? store.pendingSets.filter(s => s.workout_session_block_exercise_id === current.id && s.set_number === currentSet)
        : [];
    const activeSide: 'left' | 'right' = currentSetSides.some(s => s.side === 'left') ? 'right' : 'left';

    const hasInput = isDuration && isUnilateral
        ? (activeSide === 'left' ? exerciseDurationLeft : exerciseDurationRight) > 0
        : isDuration
            ? exerciseDuration > 0
            : isUnilateral
                ? (activeSide === 'left' ? repsLeft : repsRight).trim() !== ''
                : reps.trim() !== '';

    const completeSession = useCallback(async () => {
        if (!id) return;
        setIsCompleting(true);
        try {
            const freshSets = useActiveSessionStore.getState().pendingSets;

            const seen = new Set<string>();
            const uniqueSets = freshSets.filter(s => {
                const key = `${s.workout_session_block_exercise_id}|${s.set_number}|${s.side}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            if (uniqueSets.length > 0) {
                devLog('Logging sets:', uniqueSets);
                await upsertSets.mutateAsync(uniqueSets);
            }
            await new Promise<void>((resolve, reject) =>
                updateStatus.mutate(
                    { sessionId: id, status: 'completed' },
                    { onSuccess: () => resolve(), onError: reject },
                )
            );
            trackerManager.track('session_completed', { session_id: id });
            store.clear();
            setIsCompleting(false);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300);
            setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 500);
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 700);
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 850);
            useActiveSessionUIStore.getState().reset();
            setShowCongrats(true);
        } catch (error) {
            devLog('Error completing session:', error);
            setIsCompleting(false);
        }
    }, [id, store, upsertSets, updateStatus, setIsCompleting, setShowCongrats]);

    // Collect performed set into store + update crash-recovery progress
    const saveSetAndProgress = useCallback((nextExerciseIdx: number, nextSetNumber: number) => {
        if (!current || !id) return;

        const base = {
            workout_session_id: id,
            workout_session_block_id: current.blockId,
            workout_session_block_exercise_id: current.id,
            set_number: currentSet,
            performed_rpe: null,
            performed_duration_seconds: null,
            performed_distance_meters: null,
        };

        const setsToLog: ReturnType<typeof Object.assign>[] = [];

        if (isDuration && exerciseDuration > 0) {
            setsToLog.push({ ...base, side: 'bilateral', performed_reps: null, performed_duration_seconds: exerciseDuration, performed_load_value: null });
        } else if (!isDuration) {
            setsToLog.push({ ...base, side: 'bilateral', performed_reps: parseInt(reps, 10), performed_load_value: load.trim() !== '' ? parseFloat(load.replace(',', '.')) : null });
        }

        if (setsToLog.length > 0) store.logSets(setsToLog as any);
        store.setProgress(nextExerciseIdx, nextSetNumber);
    }, [current, id, currentSet, reps, load, isDuration, exerciseDuration, store]);

    const handleLogSet = useCallback(async () => {
        Keyboard.dismiss();
        if (!current || !id || !hasInput) return;

        // Base rest per exercise + session-wide adjustment (Tagesform), floored so
        // a negative adjustment can't produce a zero-length pause
        const baseRest = current?.target_rest_seconds || session?.pause_between_sets || 60;
        const restDuration = Math.max(15, baseRest + (session?.rest_adjust_seconds ?? 0));

        // Unilateral: SEITENWEISE loggen — links → Pause → rechts → Satz fertig
        if (isUnilateral) {
            const base = {
                workout_session_id: id,
                workout_session_block_id: current.blockId,
                workout_session_block_exercise_id: current.id,
                set_number: currentSet,
                side: activeSide,
                performed_rpe: null,
                performed_duration_seconds: null,
                performed_distance_meters: null,
            };
            const sideDuration = activeSide === 'left' ? exerciseDurationLeft : exerciseDurationRight;
            const sideReps = activeSide === 'left' ? repsLeft : repsRight;
            const sideLoad = activeSide === 'left' ? loadLeft : loadRight;

            const entry = isDuration
                ? { ...base, performed_reps: null, performed_duration_seconds: sideDuration, performed_load_value: null }
                : { ...base, performed_reps: parseInt(sideReps, 10), performed_duration_seconds: null, performed_load_value: sideLoad.trim() !== '' ? parseFloat(sideLoad.replace(',', '.')) : null };
            store.logSets([entry] as never[]);

            if (isDuration) {
                stopExerciseTimerSide();
                if (activeSide === 'left') setExerciseDurationLeft(0);
                else setExerciseDurationRight(0);
            }

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (activeSide === 'left') {
                // Erste Seite fertig — Pause, dann kommt rechts im selben Satz
                store.setProgress(exerciseIdx, currentSet);
                startTimer(restDuration);
            } else {
                const nextSet = currentSet + 1;
                store.setProgress(exerciseIdx, nextSet);
                if (!isDuration) {
                    setRepsLeft('');
                    setRepsRight('');
                }
                const exerciseComplete = nextSet > totalSets;
                if (exerciseComplete) {
                    // Übung komplett — Check-Moment + Success-Haptic. Die Pause
                    // zur nächsten Übung startet erst mit der Weiter-Pill
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setShowExerciseComplete(true);
                } else {
                    startTimer(restDuration);
                }
                slideOutSet(() => {
                    setCurrentSet(nextSet);
                });
            }
            return;
        }

        // Jeder Satz (auch der letzte) rückt nur den Satz-Zähler weiter — den
        // Übungswechsel bestätigt der FAB (advanceExercise), sobald alles voll ist
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const nextSet = currentSet + 1;
        saveSetAndProgress(exerciseIdx, nextSet);
        if (isDuration) {
            setPreviousSet({ reps: formatTimer(exerciseDuration), load: '' });
            stopExerciseTimer();
            setExerciseDuration(0);
        } else {
            setPreviousSet({ reps, load });
            setReps('');
        }
        const exerciseComplete = nextSet > totalSets;
        if (exerciseComplete) {
            // Übung komplett — Check-Moment + Success-Haptic. Die Pause zur
            // nächsten Übung startet erst mit der Weiter-Pill (advanceExercise)
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowExerciseComplete(true);
        } else {
            startTimer(restDuration);
        }
        slideOutSet(() => {
            setCurrentSet(nextSet);
        });
    }, [reps, load, repsLeft, repsRight, loadLeft, loadRight, isUnilateral, isDuration, activeSide, hasInput, exerciseDuration, exerciseDurationLeft, exerciseDurationRight, saveSetAndProgress, isLastSet, isLastExercise, exerciseIdx, currentSet, current, id, session, store, startTimer, stopExerciseTimer, stopExerciseTimerSide, slideOutSet, setCurrentSet, setPreviousSet, setReps, setRepsLeft, setRepsRight, setExerciseDuration, setExerciseDurationLeft, setExerciseDurationRight]);

    // Alle Sätze der Übung eingetragen (currentSet ist über das Ziel hinaus)
    const allLogged = currentSet > totalSets;

    // FAB-Aktion: nächste Übung bzw. Session abschließen — die Pause zwischen
    // den Übungen startet genau hier, mit dem Tap auf die Weiter-Pill
    const advanceExercise = useCallback(async () => {
        if (!allLogged) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        if (isLastExercise) {
            await completeSession();
        } else {
            const baseRest = current?.target_rest_seconds || session?.pause_between_sets || 60;
            const restDuration = Math.max(15, baseRest + (session?.rest_adjust_seconds ?? 0));
            startTimer(restDuration);
            const nextIdx = exerciseIdx + 1;
            store.setProgress(nextIdx, 1);
            slideOutExercise(() => {
                setExerciseIdx(nextIdx);
                setCurrentSet(1);
            });
        }
    }, [allLogged, isLastExercise, exerciseIdx, current, session, completeSession, store, startTimer, slideOutExercise, setExerciseIdx, setCurrentSet]);

    return {
        handleLogSet,
        advanceExercise,
        completeSession,
        hasInput,
        allLogged,
        activeSide,
        isUnilateral,
        isCompleting,
        isDuration,
        isLastSet,
        isLastExercise,
        isFinish: isLastSet && isLastExercise,
    };
}
