import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric, GRADIENT } from '@/constants/theme';
import { formatTargetReps, loadUnit } from '@/helpers/format';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSessionStore } from '@/stores/active-session-store';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import {
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated from 'react-native-reanimated';

// ── Helpers ──────────────────────────────────────────────────────────────

function formatTimer(s: number) {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ── Types ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = {
    // The return type of useAnimatedStyle is AnimatedStyleHandle which is not publicly exported;
    // using `any` avoids a call-site type error that also affects ExerciseCard.
    animatedStyle: any;
    onStartExerciseTimer: () => void;
    onStopExerciseTimer: () => void;
    onStartExerciseTimerSide: (side: 'left' | 'right') => void;
    onStopExerciseTimerSide: () => void;
};

// ── Component ─────────────────────────────────────────────────────────────

export function LogSetSection({
    animatedStyle,
    onStartExerciseTimer,
    onStopExerciseTimer,
    onStartExerciseTimerSide,
    onStopExerciseTimerSide,
}: Props) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const allExercises = useActiveSessionUIStore(s => s.allExercises);
    const exerciseIdx = useActiveSessionStore(s => s.exerciseIdx);
    const currentSet = useActiveSessionStore(s => s.currentSet);

    const reps = useActiveSessionUIStore(s => s.reps);
    const load = useActiveSessionUIStore(s => s.load);
    const repsLeft = useActiveSessionUIStore(s => s.repsLeft);
    const repsRight = useActiveSessionUIStore(s => s.repsRight);
    const loadLeft = useActiveSessionUIStore(s => s.loadLeft);
    const loadRight = useActiveSessionUIStore(s => s.loadRight);
    const previousSet = useActiveSessionUIStore(s => s.previousSet);
    const suggestionHint = useActiveSessionUIStore(s => s.suggestionHint);
    const exerciseDuration = useActiveSessionUIStore(s => s.exerciseDuration);
    const exerciseTimerActive = useActiveSessionUIStore(s => s.exerciseTimerActive);
    const exerciseDurationLeft = useActiveSessionUIStore(s => s.exerciseDurationLeft);
    const exerciseDurationRight = useActiveSessionUIStore(s => s.exerciseDurationRight);
    const exerciseTimerActiveSide = useActiveSessionUIStore(s => s.exerciseTimerActiveSide);
    const setReps = useActiveSessionUIStore(s => s.setReps);
    const setLoad = useActiveSessionUIStore(s => s.setLoad);
    const setRepsLeft = useActiveSessionUIStore(s => s.setRepsLeft);
    const setRepsRight = useActiveSessionUIStore(s => s.setRepsRight);
    const setLoadLeft = useActiveSessionUIStore(s => s.setLoadLeft);
    const setLoadRight = useActiveSessionUIStore(s => s.setLoadRight);
    const setExerciseDuration = useActiveSessionUIStore(s => s.setExerciseDuration);
    const setExerciseDurationLeft = useActiveSessionUIStore(s => s.setExerciseDurationLeft);
    const setExerciseDurationRight = useActiveSessionUIStore(s => s.setExerciseDurationRight);

    const current = allExercises[exerciseIdx] ?? null;
    if (!current) return null;

    const totalSets = current.target_sets ?? 1;
    const unit = loadUnit(current.target_load_type);
    const showLoad = unit !== '';
    const isUnilateral = current.exercise.is_unilateral;
    const isDuration = current.exercise.measurement_type === 'duration';
    const repsTarget = formatTargetReps(current.target_reps_min, current.target_reps_max);

    return (
        <Animated.View style={[styles.logSection, animatedStyle]}>
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
                                                onPress={() => onStartExerciseTimerSide(side)}
                                                disabled={exerciseTimerActiveSide !== null && !isActiveHere}
                                            >
                                                <Ionicons name="play" size={18} color={exerciseTimerActiveSide !== null && !isActiveHere ? theme.textMuted : theme.text} />
                                                <JempText type="body-sm" color={exerciseTimerActiveSide !== null && !isActiveHere ? theme.textMuted : theme.text}>Start</JempText>
                                            </Pressable>
                                        ) : (
                                            <Pressable
                                                style={[styles.exerciseTimerBtn, { backgroundColor: theme.surface }]}
                                                onPress={onStopExerciseTimerSide}
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
                                        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
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
                                        onPress={onStartExerciseTimer}
                                    >
                                        <Ionicons name="play" size={20} color={theme.text} />
                                        <JempText type="body-l" color={theme.text}>Start</JempText>
                                    </Pressable>
                                ) : (
                                    <Pressable
                                        style={[styles.exerciseTimerBtn, { backgroundColor: theme.surface }]}
                                        onPress={onStopExerciseTimer}
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
                        const sideLabelText = isLeft ? 'LINKS' : 'RECHTS';
                        return (
                            <View key={side} style={styles.unilateralRow}>
                                <JempText type="caption" color={theme.textMuted} style={styles.sideLabel}>
                                    {sideLabelText}
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
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    logSection: { gap: 12 },

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
});
