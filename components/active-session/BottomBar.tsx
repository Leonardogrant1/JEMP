import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { formatTimer } from '@/helpers/active-session-helpers';
import { loadUnit } from '@/helpers/format';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Keyboard, Pressable, StyleSheet, View } from 'react-native';


export function BottomBar() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { data: session } = useSessionDetailQuery(id);

    const { exerciseIdx, currentSet, setExerciseIdx, setCurrentSet, saveProgress, slideOutExercise, slideOutSet } = useActiveSessionTransition();
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

    const current = allExercises[exerciseIdx] ?? null;
    const totalSets = current?.target_sets ?? 1;
    const isLastSet = currentSet >= totalSets;
    const isLastExercise = exerciseIdx === allExercises.length - 1;
    const isUnilateral = current?.exercise.laterality === 'unilateral';
    const isDuration = current?.exercise.measurement_type === 'duration';
    const unit = current ? loadUnit(current.target_load_type) : '';

    const hasInput = isDuration && isUnilateral
        ? exerciseDurationLeft > 0 || exerciseDurationRight > 0
        : isDuration
            ? exerciseDuration > 0
            : isUnilateral
                ? repsLeft.trim() !== '' || repsRight.trim() !== ''
                : reps.trim() !== '';

    const label = isLastSet && isLastExercise
        ? t('ui.log_and_finish')
        : isLastSet
            ? t('ui.log_and_next')
            : t('ui.log_set_and_next');

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
    }, [id, store, upsertSets, updateStatus]);

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

        if (isDuration && isUnilateral) {
            if (exerciseDurationLeft > 0) setsToLog.push({ ...base, side: 'left', performed_reps: null, performed_duration_seconds: exerciseDurationLeft, performed_load_value: null });
            if (exerciseDurationRight > 0) setsToLog.push({ ...base, side: 'right', performed_reps: null, performed_duration_seconds: exerciseDurationRight, performed_load_value: null });
        } else if (isDuration && exerciseDuration > 0) {
            setsToLog.push({ ...base, side: 'bilateral', performed_reps: null, performed_duration_seconds: exerciseDuration, performed_load_value: null });
        } else if (isUnilateral) {
            if (repsLeft.trim() !== '') setsToLog.push({ ...base, side: 'left', performed_reps: parseInt(repsLeft, 10), performed_load_value: loadLeft.trim() !== '' ? parseFloat(loadLeft.replace(',', '.')) : null });
            if (repsRight.trim() !== '') setsToLog.push({ ...base, side: 'right', performed_reps: parseInt(repsRight, 10), performed_load_value: loadRight.trim() !== '' ? parseFloat(loadRight.replace(',', '.')) : null });
        } else {
            setsToLog.push({ ...base, side: 'bilateral', performed_reps: parseInt(reps, 10), performed_load_value: load.trim() !== '' ? parseFloat(load.replace(',', '.')) : null });
        }

        if (setsToLog.length > 0) store.logSets(setsToLog as any);
        store.setProgress(nextExerciseIdx, nextSetNumber);
    }, [current, id, currentSet, reps, load, repsLeft, repsRight, loadLeft, loadRight, isUnilateral, isDuration, exerciseDuration, exerciseDurationLeft, exerciseDurationRight, store]);

    const handleLogSet = useCallback(async () => {
        Keyboard.dismiss();
        const canLog = isDuration && isUnilateral
            ? (exerciseDurationLeft > 0 || exerciseDurationRight > 0)
            : isDuration
                ? exerciseDuration > 0
                : isUnilateral
                    ? (repsLeft.trim() !== '' || repsRight.trim() !== '')
                    : reps.trim() !== '';
        if (!canLog) return;

        // Base rest per exercise + session-wide adjustment (Tagesform), floored so
        // a negative adjustment can't produce a zero-length pause
        const baseRest = current?.target_rest_seconds || session?.pause_between_sets || 60;
        const restDuration = Math.max(15, baseRest + (session?.rest_adjust_seconds ?? 0));

        if (isLastSet && isLastExercise) {
            saveSetAndProgress(exerciseIdx, currentSet);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await completeSession();
        } else if (isLastSet) {
            // Exercise change — heavy haptic + exercise slide transition
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            const nextIdx = exerciseIdx + 1;
            saveSetAndProgress(nextIdx, 1);
            if (isUnilateral) {
                setPreviousSet({ reps: repsLeft, load: loadLeft, repsRight });
            } else if (!isDuration) {
                setPreviousSet({ reps, load });
            }
            startTimer(restDuration);
            slideOutExercise(() => {
                setExerciseIdx(nextIdx);
                setCurrentSet(1);
            });
        } else {
            // Set change — medium haptic + log section slide transition
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const nextSet = currentSet + 1;
            saveSetAndProgress(exerciseIdx, nextSet);
            if (isDuration && isUnilateral) {
                const lStr = exerciseDurationLeft > 0 ? `L: ${formatTimer(exerciseDurationLeft)}` : '';
                const rStr = exerciseDurationRight > 0 ? `R: ${formatTimer(exerciseDurationRight)}` : '';
                setPreviousSet({ reps: [lStr, rStr].filter(Boolean).join('  '), load: '' });
                stopExerciseTimerSide();
                setExerciseDurationLeft(0);
                setExerciseDurationRight(0);
            } else if (isDuration) {
                setPreviousSet({ reps: formatTimer(exerciseDuration), load: '' });
                stopExerciseTimer();
                setExerciseDuration(0);
            } else if (isUnilateral) {
                setPreviousSet({ reps: repsLeft, load: loadLeft, repsRight });
                setRepsLeft('');
                setRepsRight('');
            } else {
                setPreviousSet({ reps, load });
                setReps('');
            }
            startTimer(restDuration);
            slideOutSet(() => {
                setCurrentSet(nextSet);
            });
        }
    }, [reps, load, repsLeft, repsRight, loadLeft, loadRight, isUnilateral, isDuration, exerciseDuration, exerciseDurationLeft, exerciseDurationRight, saveSetAndProgress, completeSession, isLastSet, isLastExercise, exerciseIdx, currentSet, current, session, startTimer, stopExerciseTimer, stopExerciseTimerSide, slideOutExercise, slideOutSet, setExerciseIdx, setCurrentSet]);

    const handleSkipSet = useCallback(async () => {
        if (isLastSet && isLastExercise) {
            Alert.alert(t('ui.finish_session_title'), t('ui.finish_session_message'), [
                { text: t('ui.cancel'), style: 'cancel' },
                { text: t('ui.finish'), style: 'destructive', onPress: () => completeSession() },
            ]);
        } else if (isLastSet) {
            saveProgress(exerciseIdx + 1, 1);
        } else {
            saveProgress(exerciseIdx, currentSet + 1);
            setReps('');
        }
    }, [isLastSet, isLastExercise, exerciseIdx, currentSet, t, saveProgress, completeSession]);

    return (
        <View style={[styles.bottomBar, { backgroundColor: theme.background }]}>
            <Pressable
                style={styles.logBtn}
                onPress={handleLogSet}
                disabled={!hasInput || isCompleting}
            >
                <LinearGradient
                    colors={hasInput ? [Cyan[500], Electric[500]] : [`${Cyan[500]}40`, `${Electric[500]}40`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.logBtnGradient}
                >
                    {isCompleting
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <JempText type="button" color="#fff">{label}</JempText>
                    }
                </LinearGradient>
            </Pressable>
            <Pressable onPress={handleSkipSet} style={styles.skipLink}>
                <JempText type="body-sm" color={theme.textMuted}>{t('ui.skip_set')}</JempText>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    bottomBar: {
        paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12,
        gap: 8, alignItems: 'center',
    },
    logBtn: { borderRadius: 100, overflow: 'hidden', width: '100%' },
    logBtnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
    skipLink: { paddingVertical: 4 },
});
