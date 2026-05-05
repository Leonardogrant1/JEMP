import { Confetti } from '@/components/confetti';
import { ExerciseVideoHero } from '@/components/exercise-video-hero';
import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { formatTargetReps, loadUnit } from '@/helpers/format';
import { calculateProgression } from '@/helpers/progression-suggestion';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useUpdateSessionStatus } from '@/mutations/use-update-session-status';
import { useUpsertPerformedSets } from '@/mutations/use-upsert-performed-set';
import { usePreviousExerciseSetsQuery } from '@/queries/use-previous-exercise-sets-query';
import { useSessionDetailQuery } from '@/queries/use-session-detail-query';
import { useActiveSessionStore } from '@/stores/active-session-store';
import { devLog } from '@/utils/dev-log';
import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, {
    Easing,
    type SharedValue,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Types ────────────────────────────────────────────────────────────────

type FlatExercise = {
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

// ── Helpers ──────────────────────────────────────────────────────────────

function formatTimer(s: number) {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ── Screen ───────────────────────────────────────────────────────────────

export default function ActiveSessionScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { data: session, isLoading } = useSessionDetailQuery(id);
    const updateStatus = useUpdateSessionStatus();
    const upsertSets = useUpsertPerformedSets();
    const [isCompleting, setIsCompleting] = useState(false);
    const [showCongrats, setShowCongrats] = useState(false);

    const store = useActiveSessionStore();

    // Flatten exercises
    const allExercises = useMemo<FlatExercise[]>(() => {
        if (!session) return [];
        return session.blocks.flatMap(block =>
            block.exercises.map(ex => ({
                ...ex,
                blockId: block.id,
                blockType: block.block_type,
            })),
        );
    }, [session]);

    // Init from saved progress
    const [exerciseIdx, setExerciseIdx] = useState(0);
    const [currentSet, setCurrentSet] = useState(1);
    const [initialized, setInitialized] = useState(false);
    const [reps, setReps] = useState('');
    const [load, setLoad] = useState('');
    const [repsLeft, setRepsLeft] = useState('');
    const [repsRight, setRepsRight] = useState('');
    const [loadLeft, setLoadLeft] = useState('');
    const [loadRight, setLoadRight] = useState('');
    const [previousSet, setPreviousSet] = useState<{ reps: string; load: string; repsRight?: string } | null>(null);
    const [suggestionHint, setSuggestionHint] = useState<string | null>(null);

    // Restore progress — prefer local store (more up-to-date), fall back to DB
    useEffect(() => {
        if (session && allExercises.length > 0 && !initialized) {
            if (store.sessionId === id) {
                // Resume from local store (no DB round-trip needed)
                setExerciseIdx(Math.min(store.exerciseIdx, allExercises.length - 1));
                setCurrentSet(store.currentSet);
            } else {
                // New session — init store and restore from DB
                const savedIdx = Math.min(session.current_exercise_index, allExercises.length - 1);
                store.initSession(id!, savedIdx, session.current_set_number);
                setExerciseIdx(savedIdx);
                setCurrentSet(session.current_set_number);
            }
            setInitialized(true);
        }
    }, [session, allExercises.length, initialized]);

    // Rest timer (count-down between sets)
    const [restSeconds, setRestSeconds] = useState(0);
    const [totalRestSeconds, setTotalRestSeconds] = useState(0);
    const [isResting, setIsResting] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Exercise timer — bilateral duration
    const [exerciseDuration, setExerciseDuration] = useState(0);
    const [exerciseTimerActive, setExerciseTimerActive] = useState(false);
    const exerciseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Exercise timer — unilateral duration (left / right independent)
    const [exerciseDurationLeft, setExerciseDurationLeft] = useState(0);
    const [exerciseDurationRight, setExerciseDurationRight] = useState(0);
    const [exerciseTimerActiveSide, setExerciseTimerActiveSide] = useState<'left' | 'right' | null>(null);
    const exerciseTimerSideRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Countdown sounds
    const tickSoundRef = useRef<AudioPlayer | null>(null);
    const endSoundRef = useRef<AudioPlayer | null>(null);
    useEffect(() => {
        const tick = createAudioPlayer(require('@/assets/sounds/countdown.mp3'));
        const end = createAudioPlayer(require('@/assets/sounds/countdown_end.mp3'));
        tickSoundRef.current = tick;
        endSoundRef.current = end;
        return () => {
            tick.remove();
            end.remove();
        };
    }, []);

    const current = allExercises[exerciseIdx] ?? null;
    const { data: prevSets } = usePreviousExerciseSetsQuery(current?.exercise.id, id);
    const totalSets = current?.target_sets ?? 1;
    const isLastSet = currentSet >= totalSets;
    const isLastExercise = exerciseIdx === allExercises.length - 1;
    const unit = current ? loadUnit(current.target_load_type) : '';
    const showLoad = unit !== '';
    const isUnilateral = current?.exercise.is_unilateral ?? false;
    const isDuration = current?.exercise.measurement_type === 'duration';

    // ── Transition animations ─────────────────────────────────────────────
    const exSlideX = useSharedValue(0);
    const exOpacity = useSharedValue(1);
    const setSlideX = useSharedValue(0);
    const setOpacity = useSharedValue(1);

    const exAnimStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: exSlideX.value }],
        opacity: exOpacity.value,
    }));
    const setAnimStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: setSlideX.value }],
        opacity: setOpacity.value,
    }));

    const slideOut = (x: SharedValue<number>, op: SharedValue<number>, dist: number, cb: () => void) => {
        'worklet';
        x.value = withTiming(-dist, { duration: 100, easing: Easing.in(Easing.ease) }, (done) => {
            'worklet';
            if (done) {
                x.value = dist * 0.6;
                op.value = 0;
                x.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.ease) });
                op.value = withTiming(1, { duration: 220 });
                runOnJS(cb)();
            }
        });
        op.value = withTiming(0, { duration: 100 });
    };

    // Save progress locally
    const saveProgress = useCallback((exIdx: number, setNum: number) => {
        store.setProgress(exIdx, setNum);
        setExerciseIdx(exIdx);
        setCurrentSet(setNum);
    }, [store]);


    // On exercise change: clear session state + timers
    useEffect(() => {
        if (!current || !initialized) return;
        setPreviousSet(null);
        setRepsLeft('');
        setRepsRight('');
        setLoadLeft('');
        setLoadRight('');
        setExerciseDuration(0);
        setExerciseTimerActive(false);
        if (exerciseTimerRef.current) {
            clearInterval(exerciseTimerRef.current);
            exerciseTimerRef.current = null;
        }
        setExerciseDurationLeft(0);
        setExerciseDurationRight(0);
        setExerciseTimerActiveSide(null);
        if (exerciseTimerSideRef.current) {
            clearInterval(exerciseTimerSideRef.current);
            exerciseTimerSideRef.current = null;
        }
        // Rest timer intentionally NOT stopped here — when moving to next exercise
        // handleLogSet starts the rest timer first, then updates exerciseIdx.
        // Stopping it here would immediately cancel the between-exercise pause.
    }, [exerciseIdx, current?.id]);

    // On exercise or set change: apply progression suggestion
    useEffect(() => {
        if (!current || !initialized) return;

        const suggestion = prevSets?.length
            ? calculateProgression(current.target_load_type, prevSets, currentSet)
            : null;

        // Prefill load: last logged set in current session → cross-session previous → target value
        // This keeps the weight consistent between sets of the same exercise within one session.
        const sessionSets = useActiveSessionStore.getState().pendingSets
            .filter(s => s.workout_session_block_exercise_id === current.id)
            .sort((a, b) => b.set_number - a.set_number);
        const lastSessionLoad = sessionSets[0]?.performed_load_value;

        const prefillLoad = lastSessionLoad != null
            ? String(lastSessionLoad)
            : suggestion?.previousLoad != null
                ? String(suggestion.previousLoad)
                : (current.target_load_value != null ? String(current.target_load_value) : '');
        const prefillReps = suggestion?.previousReps != null
            ? String(suggestion.previousReps)
            : '';
        setLoad(prefillLoad);
        setReps(prefillReps);
        setLoadLeft(prefillLoad);
        setLoadRight(prefillLoad);
        setRepsLeft(prefillReps);
        setRepsRight(prefillReps);

        // Show suggested progression as hint (only when there's a suggestion beyond the previous)
        if (suggestion?.suggestedLoad != null) {
            setSuggestionHint(`${suggestion.suggestedLoad} ${unit}`);
        } else if (suggestion?.suggestedReps != null && !showLoad) {
            setSuggestionHint(`${suggestion.suggestedReps} ${t('ui.reps').toLowerCase()}`);
        } else {
            setSuggestionHint(null);
        }
    }, [exerciseIdx, currentSet, current?.id, prevSets]);

    // Timer logic
    const startTimer = useCallback((seconds: number) => {
        stopTimer();
        setRestSeconds(seconds);
        setTotalRestSeconds(seconds);
        setIsResting(true);
        timerRef.current = setInterval(() => {
            setRestSeconds(prev => {
                if (prev <= 1) {
                    stopTimer();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setIsResting(false);
        setRestSeconds(0);
    }, []);

    useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

    const startExerciseTimer = useCallback(() => {
        if (exerciseTimerRef.current) return; // already running
        setExerciseTimerActive(true);
        exerciseTimerRef.current = setInterval(() => {
            setExerciseDuration(prev => prev + 1);
        }, 1000);
    }, []);

    const stopExerciseTimer = useCallback(() => {
        if (exerciseTimerRef.current) {
            clearInterval(exerciseTimerRef.current);
            exerciseTimerRef.current = null;
        }
        setExerciseTimerActive(false);
    }, []);

    useEffect(() => () => { if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current); }, []);
    useEffect(() => () => { if (exerciseTimerSideRef.current) clearInterval(exerciseTimerSideRef.current); }, []);

    const startExerciseTimerSide = useCallback((side: 'left' | 'right') => {
        if (exerciseTimerSideRef.current) return; // one side at a time
        setExerciseTimerActiveSide(side);
        exerciseTimerSideRef.current = setInterval(() => {
            if (side === 'left') setExerciseDurationLeft(p => p + 1);
            else setExerciseDurationRight(p => p + 1);
        }, 1000);
    }, []);

    const stopExerciseTimerSide = useCallback(() => {
        if (exerciseTimerSideRef.current) {
            clearInterval(exerciseTimerSideRef.current);
            exerciseTimerSideRef.current = null;
        }
        setExerciseTimerActiveSide(null);
    }, []);

    // Auto-stop + countdown sounds when target duration is reached (bilateral)
    useEffect(() => {
        const target = current?.target_duration_seconds ?? 0;
        if (!isDuration || isUnilateral || target === 0) return;

        const remaining = target - exerciseDuration;
        if (remaining > 0 && remaining <= 3) {
            const t = tickSoundRef.current;
            if (t) { t.seekTo(0); t.play(); }
        } else if (remaining === 0) {
            const e = endSoundRef.current;
            if (e) { e.seekTo(0); e.play(); }
        }
        if (remaining <= 0 && exerciseTimerRef.current) {
            clearInterval(exerciseTimerRef.current);
            exerciseTimerRef.current = null;
            setExerciseTimerActive(false);
            setExerciseDuration(target);
        }
    }, [exerciseDuration, current?.target_duration_seconds, isDuration, isUnilateral]);

    // Auto-stop + sounds for unilateral side timers
    useEffect(() => {
        const target = current?.target_duration_seconds ?? 0;
        if (!isDuration || !isUnilateral || target === 0) return;

        const checkSide = (duration: number, isActive: boolean, setDuration: (v: number) => void, stopFn: () => void) => {
            const remaining = target - duration;
            if (remaining > 0 && remaining <= 3) {
                const t = tickSoundRef.current;
                if (t) { t.seekTo(0); t.play(); }
            } else if (remaining === 0) {
                const e = endSoundRef.current;
                if (e) { e.seekTo(0); e.play(); }
            }
            if (remaining <= 0 && isActive) {
                stopFn();
                setDuration(target);
            }
        };

        if (exerciseTimerActiveSide === 'left') {
            checkSide(exerciseDurationLeft, true, setExerciseDurationLeft, stopExerciseTimerSide);
        } else if (exerciseTimerActiveSide === 'right') {
            checkSide(exerciseDurationRight, true, setExerciseDurationRight, stopExerciseTimerSide);
        }
    }, [exerciseDurationLeft, exerciseDurationRight, exerciseTimerActiveSide, current?.target_duration_seconds, isDuration, isUnilateral, stopExerciseTimerSide]);

    // Collect performed set into store + update progress — fully synchronous, no network
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
            if (repsLeft.trim() !== '') setsToLog.push({ ...base, side: 'left', performed_reps: parseInt(repsLeft, 10), performed_load_value: loadLeft.trim() !== '' ? parseFloat(loadLeft) : null });
            if (repsRight.trim() !== '') setsToLog.push({ ...base, side: 'right', performed_reps: parseInt(repsRight, 10), performed_load_value: loadRight.trim() !== '' ? parseFloat(loadRight) : null });
        } else if (reps.trim() !== '') {
            setsToLog.push({ ...base, side: 'bilateral', performed_reps: parseInt(reps, 10), performed_load_value: load.trim() !== '' ? parseFloat(load) : null });
        }

        if (setsToLog.length > 0) store.logSets(setsToLog as any);
        store.setProgress(nextExerciseIdx, nextSetNumber);
    }, [current, id, currentSet, reps, load, repsLeft, repsRight, loadLeft, loadRight, isUnilateral, isDuration, exerciseDuration, exerciseDurationLeft, exerciseDurationRight, store]);

    // Flush all pending sets to DB, mark session complete, show congrats
    const completeSession = useCallback(async () => {
        if (!id) return;
        setIsCompleting(true);
        try {
            // Read directly from Zustand store (not the React snapshot) so we get the
            // freshest pendingSets — including any set logged in the same tick as this call.
            const freshSets = useActiveSessionStore.getState().pendingSets;

            // Deduplicate by (exercise_id, set_number, side) — a batch with duplicate
            // unique keys fails even with onConflict upsert.
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
            // Haptic celebration sequence
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300);
            setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 500);
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 700);
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 850);
            setShowCongrats(true);
        } catch (error) {
            devLog('Error completing session:', error);
            setIsCompleting(false);
        }
    }, [id, store, upsertSets, updateStatus]);

    // Log set & next
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
            slideOut(exSlideX, exOpacity, 40, () => {
                setExerciseIdx(nextIdx);
                setCurrentSet(1);
            });
            const restDuration = current?.target_rest_seconds || session?.pause_between_sets || 60;
            startTimer(restDuration);
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
            slideOut(setSlideX, setOpacity, 24, () => {
                setCurrentSet(nextSet);
            });
            const restDuration = current?.target_rest_seconds || session?.pause_between_sets || 60;
            startTimer(restDuration);
        }
    }, [reps, load, repsLeft, repsRight, loadLeft, loadRight, isUnilateral, isDuration, exerciseDuration, exerciseDurationLeft, exerciseDurationRight, saveSetAndProgress, completeSession, isLastSet, isLastExercise, exerciseIdx, currentSet, current, session, startTimer, stopExerciseTimer, stopExerciseTimerSide, exSlideX, exOpacity, setSlideX, setOpacity, slideOut]);

    // Skip set
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

    // Finish early
    const handleFinishEarly = useCallback(() => {
        Alert.alert(t('ui.finish_session_title'), t('ui.finish_session_message'), [
            { text: t('ui.cancel'), style: 'cancel' },
            { text: t('ui.finish'), style: 'destructive', onPress: () => completeSession() },
        ]);
    }, [t, completeSession]);

    const leaveSession = useCallback(() => {
        router.back();
    }, [router]);

    // ── Render ───────────────────────────────────────────────────────────

    if (isLoading || !session) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
                <View style={styles.centered}>
                    {isLoading
                        ? <ActivityIndicator color={theme.primary} />
                        : <JempText type="body-l" color={theme.textMuted}>{t('ui.session_not_found')}</JempText>
                    }
                </View>
            </SafeAreaView>
        );
    }

    if (!current) return null;

    const repsTarget = formatTargetReps(current.target_reps_min, current.target_reps_max);

    // ── Congrats dialog ──
    if (showCongrats) {
        return (
            <Modal transparent animationType="fade" visible statusBarTranslucent>
                <View style={styles.congratsOverlay}>
                    <Confetti />
                    <View style={[styles.congratsCard, { backgroundColor: theme.surface }]}>
                        <JempText type="body-l" style={styles.congratsEmoji}>🏆</JempText>
                        <JempText type="h1" style={{ textAlign: 'center' }}>{t('ui.congrats_title')}</JempText>
                        <JempText type="body-l" color={theme.textMuted} style={{ textAlign: 'center' }}>
                            {session.name}
                        </JempText>
                        <Pressable
                            onPress={() => router.replace(`/session-summary/${id}` as any)}
                            style={styles.congratsBtn}
                        >
                            <LinearGradient
                                colors={[Cyan[500], Electric[500]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.congratsBtnGradient}
                            >
                                <JempText type="button" color="#fff">{t('ui.view_summary')}</JempText>
                            </LinearGradient>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <Pressable onPress={leaveSession} style={styles.headerSide}>
                    <Ionicons name="chevron-back" size={24} color={theme.text} />
                </Pressable>
                <View style={styles.headerCenter}>
                    <JempText type="body-l" color={theme.textMuted} numberOfLines={1}>{session.name}</JempText>
                    <View style={[styles.progressTrack, { backgroundColor: theme.borderStrong }]}>
                        <View style={[styles.progressFill, { width: `${((exerciseIdx + 1) / allExercises.length) * 100}%` as any }]}>
                            <LinearGradient
                                colors={[Cyan[500], Electric[500]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </View>
                    </View>
                </View>
                <View style={styles.headerSide} />
            </View>

            <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                    {/* ── Exercise title + video + equipment (slides on exercise change) ── */}
                    <Animated.View style={exAnimStyle}>
                        <View style={styles.titleRow}>
                            <View style={styles.titleLeft}>
                                <JempText type="caption" color={GradientMid} style={styles.blockLabel}>
                                    {current.blockType
                                        ? t(`block_type.${current.blockType.slug}`).toUpperCase()
                                        : t('ui.active_session').toUpperCase()}
                                </JempText>
                                <JempText type="hero">{current.exercise.name}</JempText>
                            </View>
                        </View>

                        <ExerciseVideoHero
                            key={current.exercise.id}
                            videoStoragePath={current.exercise.video_storage_path}
                            youtubeUrl={current.exercise.youtube_url}
                            thumbnailStoragePath={current.exercise.thumbnail_storage_path}
                            exerciseId={current.exercise.id}
                        />

                        {current.exercise.equipment?.length > 0 && (
                            <View style={styles.equipmentSection}>
                                <JempText type="caption" color={theme.textMuted} style={styles.equipmentLabel}>
                                    Benötigtes Equipment
                                </JempText>
                                <View style={styles.equipmentRow}>
                                    {current.exercise.equipment.map((eq, i) => {
                                        const label = (eq.name_i18n as any)?.[locale] ?? eq.slug;
                                        return (
                                            <View key={i} style={[styles.equipmentChip, { backgroundColor: theme.surface }]}>
                                                <JempText type="caption" color="#fff" style={styles.equipmentChipText}>{label}</JempText>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    </Animated.View>

                    {/* ── Rest timer ── */}
                    {isResting && (
                        <View style={[styles.timerCard, { backgroundColor: theme.surface }]}>
                            <JempText type="caption" color={theme.textMuted} style={styles.timerLabel}>
                                PAUSE
                            </JempText>
                            <JempText type="hero" gradient style={styles.timerDisplay}>
                                {formatTimer(restSeconds)}
                            </JempText>
                            <View style={[styles.timerTrack, { backgroundColor: theme.borderStrong }]}>
                                <View style={[
                                    styles.timerFill,
                                    { width: `${totalRestSeconds > 0 ? (1 - restSeconds / totalRestSeconds) * 100 : 100}%` as any },
                                ]}>
                                    <LinearGradient
                                        colors={[Cyan[500], Electric[500]]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                </View>
                            </View>
                            <View style={styles.timerActions}>
                                <Pressable
                                    style={[styles.timerBtn, { backgroundColor: theme.surface }]}
                                    onPress={() => {
                                        setRestSeconds(prev => prev + 30);
                                        setTotalRestSeconds(prev => prev + 30);
                                    }}
                                >
                                    <JempText type="body-sm" color={theme.text}>+ 30s</JempText>
                                </Pressable>
                                <Pressable style={[styles.timerSkip, { backgroundColor: theme.surface }]} onPress={stopTimer}>
                                    <JempText type="body-sm" color={theme.textMuted}>Überspringen</JempText>
                                </Pressable>
                            </View>
                        </View>
                    )}

                    {/* ── Log set inputs (slides on set change) ── */}
                    <Animated.View style={[styles.logSection, setAnimStyle]}>
                        <JempText type="h2">
                            {t('ui.log_set')} {currentSet} / {totalSets}
                        </JempText>

                        {isDuration && isUnilateral ? (
                            /* Duration + Unilateral: two independent timers */
                            <View style={styles.unilateralRows}>
                                {(['left', 'right'] as const).map(side => {
                                    const isLeft = side === 'left';
                                    const sideLabel = isLeft ? 'LINKS' : 'RECHTS';
                                    const sideDuration = isLeft ? exerciseDurationLeft : exerciseDurationRight;
                                    const setSideDuration = isLeft ? setExerciseDurationLeft : setExerciseDurationRight;
                                    const isActiveHere = exerciseTimerActiveSide === side;
                                    const target = current.target_duration_seconds ?? 0;
                                    const hasTarget = target > 0;
                                    const displaySec = hasTarget ? Math.max(0, target - sideDuration) : sideDuration;
                                    const progress = hasTarget ? Math.min(sideDuration / target, 1) : 0;
                                    const done = hasTarget && sideDuration >= target;
                                    return (
                                        <View key={side} style={styles.unilateralRow}>
                                            <JempText type="caption" color={theme.textMuted} style={styles.sideLabel}>
                                                {sideLabel}
                                            </JempText>
                                            <View style={styles.exerciseTimerBlock}>
                                                <JempText type="h1" gradient style={styles.exerciseTimerDisplaySide}>
                                                    {formatTimer(displaySec)}
                                                </JempText>
                                                {hasTarget && (
                                                    <View style={[styles.timerTrack, { backgroundColor: theme.borderStrong, width: '100%' }]}>
                                                        <View style={[styles.timerFill, { width: `${progress * 100}%` as any }]}>
                                                            <LinearGradient colors={[Cyan[500], Electric[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                                                        </View>
                                                    </View>
                                                )}
                                                <View style={styles.exerciseTimerActions}>
                                                    {done ? (
                                                        <View style={[styles.exerciseTimerBtn, { backgroundColor: theme.surface }]}>
                                                            <Ionicons name="checkmark-circle" size={18} color={Cyan[500]} />
                                                            <JempText type="body-sm" color={Cyan[500]}>Geschafft!</JempText>
                                                        </View>
                                                    ) : !isActiveHere ? (
                                                        <Pressable
                                                            style={[styles.exerciseTimerBtn, { backgroundColor: theme.surface }]}
                                                            onPress={() => startExerciseTimerSide(side)}
                                                            disabled={exerciseTimerActiveSide !== null && !isActiveHere}
                                                        >
                                                            <Ionicons name="play" size={18} color={exerciseTimerActiveSide !== null && !isActiveHere ? theme.textMuted : theme.text} />
                                                            <JempText type="body-sm" color={exerciseTimerActiveSide !== null && !isActiveHere ? theme.textMuted : theme.text}>Start</JempText>
                                                        </Pressable>
                                                    ) : (
                                                        <Pressable
                                                            style={[styles.exerciseTimerBtn, { backgroundColor: theme.surface }]}
                                                            onPress={stopExerciseTimerSide}
                                                        >
                                                            <Ionicons name="stop" size={18} color={theme.text} />
                                                            <JempText type="body-sm" color={theme.text}>Stop</JempText>
                                                        </Pressable>
                                                    )}
                                                    {sideDuration > 0 && !isActiveHere && !done && (
                                                        <Pressable
                                                            style={[styles.exerciseTimerReset, { backgroundColor: theme.surface }]}
                                                            onPress={() => setSideDuration(0)}
                                                        >
                                                            <Ionicons name="refresh" size={16} color={theme.textMuted} />
                                                        </Pressable>
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        ) : isDuration ? (
                            /* Duration bilateral: single countdown/count-up timer */
                            (() => {
                                const target = current.target_duration_seconds ?? 0;
                                const hasTarget = target > 0;
                                const displaySeconds = hasTarget ? Math.max(0, target - exerciseDuration) : exerciseDuration;
                                const progress = hasTarget ? Math.min(exerciseDuration / target, 1) : 0;
                                const done = hasTarget && exerciseDuration >= target;
                                return (
                                    <View style={styles.exerciseTimerBlock}>
                                        <JempText type="hero" gradient style={styles.exerciseTimerDisplay}>
                                            {formatTimer(displaySeconds)}
                                        </JempText>
                                        {hasTarget && (
                                            <View style={[styles.timerTrack, { backgroundColor: theme.borderStrong, width: '100%' }]}>
                                                <View style={[styles.timerFill, { width: `${progress * 100}%` as any }]}>
                                                    <LinearGradient colors={[Cyan[500], Electric[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                                                </View>
                                            </View>
                                        )}
                                        <View style={styles.exerciseTimerActions}>
                                            {done ? (
                                                <View style={[styles.exerciseTimerBtn, { backgroundColor: theme.surface }]}>
                                                    <Ionicons name="checkmark-circle" size={20} color={Cyan[500]} />
                                                    <JempText type="body-l" color={Cyan[500]}>Geschafft!</JempText>
                                                </View>
                                            ) : !exerciseTimerActive ? (
                                                <Pressable
                                                    style={[styles.exerciseTimerBtn, { backgroundColor: theme.surface }]}
                                                    onPress={startExerciseTimer}
                                                >
                                                    <Ionicons name="play" size={20} color={theme.text} />
                                                    <JempText type="body-l" color={theme.text}>Start</JempText>
                                                </Pressable>
                                            ) : (
                                                <Pressable
                                                    style={[styles.exerciseTimerBtn, { backgroundColor: theme.surface }]}
                                                    onPress={stopExerciseTimer}
                                                >
                                                    <Ionicons name="stop" size={20} color={theme.text} />
                                                    <JempText type="body-l" color={theme.text}>Stop</JempText>
                                                </Pressable>
                                            )}
                                            {exerciseDuration > 0 && !exerciseTimerActive && !done && (
                                                <Pressable
                                                    style={[styles.exerciseTimerReset, { backgroundColor: theme.surface }]}
                                                    onPress={() => setExerciseDuration(0)}
                                                >
                                                    <Ionicons name="refresh" size={18} color={theme.textMuted} />
                                                </Pressable>
                                            )}
                                        </View>
                                    </View>
                                );
                            })()
                        ) : isUnilateral ? (
                            /* Unilateral: two rows — left and right */
                            <View style={styles.unilateralRows}>
                                {(['left', 'right'] as const).map(side => {
                                    const isLeft = side === 'left';
                                    const sideReps = isLeft ? repsLeft : repsRight;
                                    const setSideReps = isLeft ? setRepsLeft : setRepsRight;
                                    const sideLoad = isLeft ? loadLeft : loadRight;
                                    const setSideLoad = isLeft ? setLoadLeft : setLoadRight;
                                    const sideLabel = isLeft ? 'LINKS' : 'RECHTS';
                                    return (
                                        <View key={side} style={styles.unilateralRow}>
                                            <JempText type="caption" color={theme.textMuted} style={styles.sideLabel}>
                                                {sideLabel}
                                            </JempText>
                                            <View style={styles.inputRow}>
                                                {showLoad && (
                                                    <View style={styles.inputGroup}>
                                                        <JempText type="caption" color={theme.textMuted}>
                                                            {t('ui.load').toUpperCase()} ({unit.toUpperCase()})
                                                        </JempText>
                                                        <View style={[styles.pillInput, { backgroundColor: theme.surface }]}>
                                                            <TextInput
                                                                style={[styles.pillTextInput, { color: theme.text }]}
                                                                value={sideLoad}
                                                                onChangeText={setSideLoad}
                                                                keyboardType="decimal-pad"
                                                                placeholder="–"
                                                                placeholderTextColor={theme.textPlaceholder}
                                                            />
                                                        </View>
                                                    </View>
                                                )}
                                                {showLoad && (
                                                    <JempText type="h2" color={theme.textMuted} style={styles.inputDivider}>×</JempText>
                                                )}
                                                <View style={styles.inputGroup}>
                                                    <JempText type="caption" color={theme.textMuted}>
                                                        {t('ui.reps').toUpperCase()}
                                                    </JempText>
                                                    <View style={[styles.pillInput, { backgroundColor: theme.surface }]}>
                                                        <TextInput
                                                            style={[styles.pillTextInput, { color: theme.text }]}
                                                            value={sideReps}
                                                            onChangeText={setSideReps}
                                                            keyboardType="number-pad"
                                                            placeholder={repsTarget !== '–' ? repsTarget : '–'}
                                                            placeholderTextColor={theme.textPlaceholder}
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        ) : (
                            /* Bilateral: single row */
                            <View style={styles.inputRow}>
                                {showLoad && (
                                    <View style={styles.inputGroup}>
                                        <JempText type="caption" color={theme.textMuted}>
                                            {t('ui.load').toUpperCase()} ({unit.toUpperCase()})
                                        </JempText>
                                        <View style={[styles.pillInput, { backgroundColor: theme.surface }]}>
                                            <TextInput
                                                style={[styles.pillTextInput, { color: theme.text }]}
                                                value={load}
                                                onChangeText={setLoad}
                                                keyboardType="decimal-pad"
                                                placeholder="–"
                                                placeholderTextColor={theme.textPlaceholder}
                                            />
                                        </View>
                                    </View>
                                )}
                                {showLoad && (
                                    <JempText type="h2" color={theme.textMuted} style={styles.inputDivider}>×</JempText>
                                )}
                                <View style={styles.inputGroup}>
                                    <JempText type="caption" color={theme.textMuted}>
                                        {t('ui.reps').toUpperCase()}
                                    </JempText>
                                    <View style={[styles.pillInput, { backgroundColor: theme.surface }]}>
                                        <TextInput
                                            style={[styles.pillTextInput, { color: theme.text }]}
                                            value={reps}
                                            onChangeText={setReps}
                                            keyboardType="number-pad"
                                            placeholder={repsTarget !== '–' ? repsTarget : '–'}
                                            placeholderTextColor={theme.textPlaceholder}
                                        />
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Previous set info (within current session) */}
                        {previousSet && (
                            <JempText type="caption" color={theme.textMuted} style={styles.previousLabel}>
                                {t('ui.previous')}: {
                                    isDuration
                                        ? previousSet.reps
                                        : previousSet.repsRight != null
                                            ? `L: ${previousSet.load && unit ? `${previousSet.load} ${unit} × ` : ''}${previousSet.reps}  R: ${previousSet.repsRight}`
                                            : `${previousSet.load && unit ? `${previousSet.load} ${unit} × ` : ''}${previousSet.reps} ${t('ui.reps').toLowerCase()}`
                                }
                            </JempText>
                        )}

                        {/* Progression hint (from previous week) */}
                        {suggestionHint && !previousSet && (
                            <JempText type="caption" color={theme.textMuted} style={styles.previousLabel}>
                                {t('ui.progression_hint' as any, { value: suggestionHint })}
                            </JempText>
                        )}
                    </Animated.View>
                </ScrollView>

                {/* ── Bottom CTAs ── */}
                <View style={[styles.bottomBar, { backgroundColor: theme.background, position: undefined }]}>
                    <Pressable
                        style={styles.logBtn}
                        onPress={handleLogSet}
                        disabled={((isDuration && isUnilateral) ? (exerciseDurationLeft === 0 && exerciseDurationRight === 0) : isDuration ? exerciseDuration === 0 : isUnilateral ? (repsLeft.trim() === '' && repsRight.trim() === '') : reps.trim() === '') || isCompleting}
                    >
                        <LinearGradient
                            colors={((isDuration && isUnilateral) ? (exerciseDurationLeft > 0 || exerciseDurationRight > 0) : isDuration ? exerciseDuration > 0 : isUnilateral ? (repsLeft.trim() !== '' || repsRight.trim() !== '') : reps.trim() !== '') ? [Cyan[500], Electric[500]] : [`${Cyan[500]}40`, `${Electric[500]}40`]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.logBtnGradient}
                        >
                            {isCompleting ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <JempText type="button" color="#fff">
                                    {isLastSet && isLastExercise
                                        ? t('ui.log_and_finish')
                                        : isLastSet
                                            ? t('ui.log_and_next')
                                            : t('ui.log_set_and_next')}
                                </JempText>
                            )}
                        </LinearGradient>
                    </Pressable>
                    <Pressable onPress={handleSkipSet} style={styles.skipLink}>
                        <JempText type="body-sm" color={theme.textMuted}>{t('ui.skip_set')}</JempText>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 20 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerSide: { width: 24 },
    headerCenter: { flex: 1, alignItems: 'center', gap: 10, paddingHorizontal: 12 },
    progressTrack: { width: '80%', height: 3, borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: 3, borderRadius: 2, overflow: 'hidden' },

    // Title
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    titleLeft: { flex: 1, gap: 6 },
    blockLabel: { letterSpacing: 1.5 },
    setCounter: { alignItems: 'center', marginLeft: 12 },
    equipmentSection: { gap: 12 },
    equipmentLabel: { letterSpacing: 0.5 },
    equipmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    equipmentChip: { borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16, borderWidth: 1, borderColor: GradientMid },
    equipmentChipText: { fontSize: 14, fontWeight: '500' },

    // Timer
    timerCard: {
        alignItems: 'center',
        gap: 14,
        paddingVertical: 24,
        paddingHorizontal: 24,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: GradientMid + '55',
    },
    timerLabel: {
        letterSpacing: 2,
    },
    timerDisplay: {
        fontSize: 64,
        lineHeight: 72,
    },
    timerTrack: {
        width: '100%',
        height: 3,
        borderRadius: 2,
        overflow: 'hidden',
    },
    timerFill: {
        height: 3,
        borderRadius: 2,
        overflow: 'hidden',
    },
    timerActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    timerBtn: {
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    timerSkip: {
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },

    // Log set
    logSection: { gap: 12 },
    exerciseTimerBlock: { alignItems: 'center', gap: 12, paddingVertical: 8 },
    exerciseTimerDisplay: { fontSize: 72, lineHeight: 80 },
    exerciseTimerDisplaySide: { fontSize: 48, lineHeight: 56 },
    exerciseTimerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    exerciseTimerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 100,
        paddingHorizontal: 28,
        paddingVertical: 14,
    },
    exerciseTimerReset: {
        borderRadius: 100,
        padding: 12,
    },
    unilateralRows: { gap: 16 },
    unilateralRow: { gap: 8 },
    sideLabel: { letterSpacing: 1.5 },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
    },
    inputGroup: { flex: 1, gap: 6 },
    inputDivider: { paddingBottom: 12 },
    pillInput: {
        borderRadius: 14,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pillTextInput: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        width: '100%',
        height: '100%',
    },
    previousLabel: { textAlign: 'center' },

    // Congrats
    congratsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    congratsCard: {
        width: '100%',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        gap: 16,
    },
    congratsEmoji: {
        fontSize: 64,
        lineHeight: 72,
    },
    congratsBtn: {
        borderRadius: 100,
        overflow: 'hidden',
        width: '100%',
        marginTop: 8,
    },
    congratsBtnGradient: {
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Bottom
    bottomBar: {
        paddingHorizontal: 20,
        paddingBottom: 24,
        paddingTop: 12,
        gap: 8,
        alignItems: 'center',
    },
    logBtn: { borderRadius: 100, overflow: 'hidden', width: '100%' },
    logBtnGradient: {
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skipLink: { paddingVertical: 4 },
});
