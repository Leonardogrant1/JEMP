import { BottomBar } from '@/components/active-session/BottomBar';
import { ExerciseCard } from '@/components/active-session/ExerciseCard';
import { LogSetSection } from '@/components/active-session/LogSetSection';
import { RestTimerCard } from '@/components/active-session/RestTimerCard';
import { SessionHeader } from '@/components/active-session/SessionHeader';
import { TimerAutoStopper } from '@/components/active-session/timer-auto-stopper';
import { Confetti } from '@/components/confetti';
import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { loadUnit } from '@/helpers/format';
import { calculateProgression } from '@/helpers/progression-suggestion';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ActiveSessionTransitionProvider, useActiveSessionTransition } from '@/providers/active-session-transition-provider';
import { RestTimerProvider } from '@/providers/rest-timer-provider';
import { ExerciseTimerProvider, useExerciseTimer } from '@/providers/timer-ref-provider';
import { usePreviousExerciseSetsQuery } from '@/queries/use-previous-exercise-sets-query';
import { useSessionDetailQuery, type SessionDetail } from '@/queries/use-session-detail-query';
import { useActiveSessionStore } from '@/stores/active-session-store';
import type { FlatExercise } from '@/stores/active-session-ui-store';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function ActiveSessionScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { data: session, isLoading } = useSessionDetailQuery(id);

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

    return (
        <ExerciseTimerProvider>
            <RestTimerProvider>
                <ActiveSessionTransitionProvider>
                    <TimerAutoStopper>
                        <ActiveSessionContent id={id!} session={session} />
                    </TimerAutoStopper>
                </ActiveSessionTransitionProvider>
            </RestTimerProvider>
        </ExerciseTimerProvider>
    );
}

function ActiveSessionContent({ id, session }: { id: string; session: SessionDetail }) {
    const router = useRouter();
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { exerciseIdx, currentSet, setExerciseIdx, setCurrentSet } = useActiveSessionTransition();
    const { stopExerciseTimer, stopExerciseTimerSide, setExerciseDuration, setExerciseDurationLeft, setExerciseDurationRight } = useExerciseTimer();

    const store = useActiveSessionStore();
    const {
        initialized, showCongrats,
        setSession, setReps, setLoad, setRepsLeft, setRepsRight, setLoadLeft, setLoadRight,
        setPreviousSet, setSuggestionHint,
        setInitialized,
        resetInputs,
    } = useActiveSessionUIStore();

    // Flatten exercises
    const allExercises = useMemo<FlatExercise[]>(() => {
        return session.blocks.flatMap(block =>
            block.exercises.map(ex => ({
                ...ex,
                blockId: block.id,
                blockType: block.block_type,
            })),
        );
    }, [session]);

    // Reset initialized on unmount so re-entering the screen reinitializes correctly
    useEffect(() => {
        return () => setInitialized(false);
    }, []);

    // Sync session data into UI store
    useEffect(() => {
        setSession(session, allExercises);
    }, [session, allExercises, setSession]);

    // Restore progress — prefer local store (more up-to-date), fall back to DB
    useEffect(() => {
        console.log(allExercises.length, initialized);
        if (allExercises.length > 0 && !initialized) {
            if (store.sessionId === id) {
                console.log('restoring');
                const clampedIdx = Math.min(store.exerciseIdx, allExercises.length - 1);
                setExerciseIdx(clampedIdx);
                setCurrentSet(store.currentSet);
            } else {
                console.log('restoring from DB');
                const savedIdx = Math.min(session.current_exercise_index, allExercises.length - 1);
                store.initSession(id, savedIdx, session.current_set_number);
                setExerciseIdx(savedIdx);
                setCurrentSet(session.current_set_number);
            }
            setInitialized(true);
        }
    }, [allExercises.length, initialized]);

    const current = allExercises[exerciseIdx] ?? null;
    const { data: prevSets } = usePreviousExerciseSetsQuery(current?.exercise.id, id);
    const unit = current ? loadUnit(current.target_load_type) : '';
    const showLoad = unit !== '';

    // On exercise change: clear inputs + exercise timers
    useEffect(() => {
        if (!current || !initialized) return;
        setPreviousSet(null);
        resetInputs();
        stopExerciseTimer();
        setExerciseDuration(0);
        stopExerciseTimerSide();
        setExerciseDurationLeft(0);
        setExerciseDurationRight(0);
        // Rest timer intentionally NOT stopped here — handleLogSet starts the rest timer
        // before updating exerciseIdx, so stopping here would cancel the between-exercise pause.
    }, [exerciseIdx, current?.id]);

    // On exercise or set change: apply progression suggestion
    useEffect(() => {
        if (!current || !initialized) return;

        const suggestion = prevSets?.length
            ? calculateProgression(current.target_load_type, prevSets, currentSet)
            : null;

        // Prefill load: last logged set in current session → cross-session previous → target value
        const sessionSets = useActiveSessionStore.getState().pendingSets
            .filter(s => s.workout_session_block_exercise_id === current.id)
            .sort((a, b) => b.set_number - a.set_number);
        const lastSessionLoad = sessionSets[0]?.performed_load_value;

        const prefillLoad = lastSessionLoad != null
            ? String(lastSessionLoad)
            : suggestion?.previousLoad != null
                ? String(suggestion.previousLoad)
                : (current.target_load_value != null ? String(current.target_load_value) : '');
        const prefillReps = suggestion?.previousReps != null ? String(suggestion.previousReps) : '';

        setLoad(prefillLoad);
        setReps(prefillReps);
        setLoadLeft(prefillLoad);
        setLoadRight(prefillLoad);
        setRepsLeft(prefillReps);
        setRepsRight(prefillReps);

        if (suggestion?.suggestedLoad != null) {
            setSuggestionHint(`${suggestion.suggestedLoad} ${unit}`);
        } else if (suggestion?.suggestedReps != null && !showLoad) {
            setSuggestionHint(`${suggestion.suggestedReps} ${t('ui.reps').toLowerCase()}`);
        } else {
            setSuggestionHint(null);
        }
    }, [exerciseIdx, currentSet, current?.id, prevSets]);

    const leaveSession = useCallback(() => {
        router.back();
    }, [router]);

    if (!current) return null;

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
            <SessionHeader onBack={leaveSession} />

            <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <ExerciseCard />
                    <RestTimerCard />
                    <LogSetSection />
                </ScrollView>

                <BottomBar />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 20 },

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
});
