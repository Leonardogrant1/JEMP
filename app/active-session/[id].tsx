import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { formatTargetReps, loadUnit } from '@/helpers/format';
import { exerciseThumbnailUrl } from '@/helpers/exercise-storage';
import { youtubeThumbUrl } from '@/helpers/youtube';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUpdateSessionProgress } from '@/mutations/use-update-session-progress';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useUpdateSessionStatus } from '@/mutations/use-update-session-status';
import { useUpsertPerformedSets } from '@/mutations/use-upsert-performed-set';
import { useSessionDetailQuery } from '@/queries/use-session-detail-query';
import { usePreviousExerciseSetsQuery } from '@/queries/use-previous-exercise-sets-query';
import { calculateProgression } from '@/helpers/progression-suggestion';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PLACEHOLDER = require('@/assets/images/splash-icon.png');

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
    const updateProgress = useUpdateSessionProgress();
    const upsertSets = useUpsertPerformedSets();

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
    const [previousSet, setPreviousSet] = useState<{ reps: string; load: string } | null>(null);
    const [suggestionHint, setSuggestionHint] = useState<string | null>(null);

    // Restore progress from DB on first load
    useEffect(() => {
        if (session && allExercises.length > 0 && !initialized) {
            const savedIdx = Math.min(session.current_exercise_index, allExercises.length - 1);
            setExerciseIdx(savedIdx);
            setCurrentSet(session.current_set_number);
            setInitialized(true);
        }
    }, [session, allExercises.length, initialized]);

    // Rest timer
    const [restSeconds, setRestSeconds] = useState(0);
    const [totalRestSeconds, setTotalRestSeconds] = useState(0);
    const [isResting, setIsResting] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const current = allExercises[exerciseIdx] ?? null;
    const { data: prevSets } = usePreviousExerciseSetsQuery(current?.exercise.id, id);
    const totalSets = current?.target_sets ?? 1;
    const isLastSet = currentSet >= totalSets;
    const isLastExercise = exerciseIdx === allExercises.length - 1;
    const unit = current ? loadUnit(current.target_load_type) : '';
    const showLoad = unit !== '';

    // Save progress to DB
    const saveProgress = useCallback(async (exIdx: number, setNum: number) => {
        if (!id) return;
        await updateProgress.mutateAsync({ sessionId: id, currentExerciseIndex: exIdx, currentSetNumber: setNum });
    }, [id, updateProgress]);


    // On exercise change: clear session state + timer
    useEffect(() => {
        if (!current || !initialized) return;
        setPreviousSet(null);
        stopTimer();
    }, [exerciseIdx, current?.id]);

    // On exercise or set change: apply progression suggestion
    useEffect(() => {
        if (!current || !initialized) return;

        const suggestion = prevSets?.length
            ? calculateProgression(current.target_load_type, prevSets, currentSet)
            : null;

        setLoad(suggestion?.suggestedLoad ?? (current.target_load_value != null ? String(current.target_load_value) : ''));
        setReps(suggestion?.suggestedReps ?? '');

        if (suggestion?.previousLoad != null) {
            setSuggestionHint(`${suggestion.previousLoad} ${unit}`);
        } else if (suggestion?.previousReps != null && !showLoad) {
            setSuggestionHint(`${suggestion.previousReps} ${t('ui.reps').toLowerCase()}`);
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

    const formatTimer = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    // Save set + progress in one go, then invalidate
    const saveSetAndProgress = useCallback(async (nextExerciseIdx: number, nextSetNumber: number) => {
        if (!current || !id) return;

        // 1. Save progress first (so DB has next position before invalidation)
        await updateProgress.mutateAsync({
            sessionId: id,
            currentExerciseIndex: nextExerciseIdx,
            currentSetNumber: nextSetNumber,
        });

        // 2. Save performed set (this triggers session-detail invalidation)
        if (reps.trim() !== '') {
            await upsertSets.mutateAsync([{
                workout_session_id: id,
                workout_session_block_id: current.blockId,
                workout_session_block_exercise_id: current.id,
                set_number: currentSet,
                performed_reps: parseInt(reps, 10),
                performed_load_value: load.trim() !== '' ? parseFloat(load) : null,
                performed_rpe: null,
                performed_duration_seconds: null,
                performed_distance_meters: null,
            }]);
        }
    }, [current, id, currentSet, reps, load, upsertSets, updateProgress]);

    // Log set & next
    const handleLogSet = useCallback(async () => {
        if (reps.trim() === '') return;

        if (isLastSet && isLastExercise) {
            await saveSetAndProgress(exerciseIdx, currentSet);
            updateStatus.mutate(
                { sessionId: id!, status: 'completed' },
                {
                    onSuccess: () => {
                        trackerManager.track('session_completed', { session_id: id });
                        router.back();
                    },
                },
            );
        } else if (isLastSet) {
            const nextIdx = exerciseIdx + 1;
            await saveSetAndProgress(nextIdx, 1);
            setPreviousSet({ reps, load });
            setExerciseIdx(nextIdx);
            setCurrentSet(1);
        } else {
            const nextSet = currentSet + 1;
            await saveSetAndProgress(exerciseIdx, nextSet);
            setPreviousSet({ reps, load });
            setCurrentSet(nextSet);
            setReps('');
            if (current?.target_rest_seconds) {
                startTimer(current.target_rest_seconds);
            }
        }
    }, [reps, load, saveSetAndProgress, isLastSet, isLastExercise, id, exerciseIdx, currentSet, updateStatus, router, current, startTimer]);

    // Skip set
    const handleSkipSet = useCallback(async () => {
        if (isLastSet && isLastExercise) {
            Alert.alert(t('ui.finish_session_title'), t('ui.finish_session_message'), [
                { text: t('ui.cancel'), style: 'cancel' },
                {
                    text: t('ui.finish'), style: 'destructive',
                    onPress: () => {
                        updateStatus.mutate(
                            { sessionId: id!, status: 'completed' },
                            {
                                onSuccess: () => {
                                    trackerManager.track('session_completed', { session_id: id });
                                    router.back();
                                },
                            },
                        );
                    },
                },
            ]);
        } else if (isLastSet) {
            const nextIdx = exerciseIdx + 1;
            await saveProgress(nextIdx, 1);
            setExerciseIdx(nextIdx);
            setCurrentSet(1);
        } else {
            const nextSet = currentSet + 1;
            await saveProgress(exerciseIdx, nextSet);
            setCurrentSet(nextSet);
            setReps('');
        }
    }, [isLastSet, isLastExercise, id, exerciseIdx, currentSet, updateStatus, router, t, saveProgress]);

    // Finish early
    const handleFinishEarly = useCallback(() => {
        Alert.alert(t('ui.finish_session_title'), t('ui.finish_session_message'), [
            { text: t('ui.cancel'), style: 'cancel' },
            {
                text: t('ui.finish'), style: 'destructive',
                onPress: () => {
                    updateStatus.mutate(
                        { sessionId: id!, status: 'completed' },
                        { onSuccess: () => router.back() },
                    );
                },
            },
        ]);
    }, [id, updateStatus, router, t]);

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

    const thumbUrl =
        exerciseThumbnailUrl(current.exercise.thumbnail_storage_path) ??
        (current.exercise.youtube_url ? youtubeThumbUrl(current.exercise.youtube_url) : null);
    const repsTarget = formatTargetReps(current.target_reps_min, current.target_reps_max);

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

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* ── Exercise title ── */}
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

                {/* ── Video card ── */}
                {current.exercise.youtube_url && (
                    <Pressable
                        key={current.exercise.id}
                        style={[styles.videoCard, { backgroundColor: theme.surface }]}
                        onPress={() => Linking.openURL(current.exercise.youtube_url!)}
                    >
                        <Image
                            source={thumbUrl ? { uri: thumbUrl } : PLACEHOLDER}
                            style={styles.videoThumb}
                            contentFit="cover"
                        />
                        <View style={styles.playOverlay}>
                            <Ionicons name="play" size={24} color="#fff" />
                        </View>
                        <JempText type="caption" color={theme.textMuted} style={styles.formGuideLabel}>
                            {t('ui.form_guide')}
                        </JempText>
                    </Pressable>
                )}

                {/* ── Equipment ── */}
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

                {/* ── Log set inputs ── */}
                <View style={styles.logSection}>
                    <JempText type="h2">
                        {t('ui.log_set')} {currentSet} / {totalSets}
                    </JempText>

                    <View style={styles.inputRow}>
                        {/* Load input */}
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

                        {/* Reps input */}
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

                    {/* Previous set info (within current session) */}
                    {previousSet && (
                        <JempText type="caption" color={theme.textMuted} style={styles.previousLabel}>
                            {t('ui.previous')}: {previousSet.load && unit ? `${previousSet.load} ${unit || 'kg'} × ` : ''}{previousSet.reps} {t('ui.reps').toLowerCase()}
                        </JempText>
                    )}

                    {/* Progression hint (from previous week) */}
                    {suggestionHint && !previousSet && (
                        <JempText type="caption" color={theme.textMuted} style={styles.previousLabel}>
                            {t('ui.progression_hint' as any, { value: suggestionHint })}
                        </JempText>
                    )}
                </View>
            </ScrollView>

            {/* ── Bottom CTAs ── */}
            <View style={[styles.bottomBar, { backgroundColor: theme.background }]}>
                <Pressable
                    style={styles.logBtn}
                    onPress={handleLogSet}
                    disabled={reps.trim() === '' || upsertSets.isPending}
                >
                    <LinearGradient
                        colors={reps.trim() !== '' ? [Cyan[500], Electric[500]] : [`${Cyan[500]}40`, `${Electric[500]}40`]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.logBtnGradient}
                    >
                        {upsertSets.isPending ? (
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
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 200, gap: 20 },

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

    // Video
    videoCard: {
        borderRadius: 14,
        overflow: 'hidden',
        height: 160,
    },
    videoThumb: { width: '100%', height: '100%' },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    formGuideLabel: {
        position: 'absolute',
        bottom: 10,
        left: 12,
    },

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

    // Bottom
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 34,
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
