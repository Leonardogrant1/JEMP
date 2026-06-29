import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { formatTimer } from '@/helpers/active-session-helpers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSessionTransition } from '@/providers/active-session-transition-provider';
import { useExerciseTimer } from '@/providers/timer-ref-provider';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

export function UniDurationSet() {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { exerciseIdx } = useActiveSessionTransition();
    const allExercises = useActiveSessionUIStore(s => s.allExercises);
    const current = allExercises[exerciseIdx] ?? null;

    const {
        exerciseDurationLeft, exerciseDurationRight,
        exerciseTimerActiveSide,
        startExerciseTimerSide, stopExerciseTimerSide,
        setExerciseDurationLeft, setExerciseDurationRight,
    } = useExerciseTimer();

    if (!current) return null;

    const target = current.target_duration_seconds ?? 0;
    const hasTarget = target > 0;

    return (
        <View style={styles.rows}>
            {(['left', 'right'] as const).map(side => {
                const isLeft = side === 'left';
                const sideDuration = isLeft ? exerciseDurationLeft : exerciseDurationRight;
                const setSideDuration = isLeft ? setExerciseDurationLeft : setExerciseDurationRight;
                const isActiveHere = exerciseTimerActiveSide === side;
                const otherSideActive = exerciseTimerActiveSide !== null && !isActiveHere;
                const displaySec = hasTarget ? Math.max(0, target - sideDuration) : sideDuration;
                const progress = hasTarget ? Math.min(sideDuration / target, 1) : 0;
                const done = hasTarget && sideDuration >= target;

                return (
                    <View key={side} style={styles.row}>
                        <JempText type="caption" color={theme.textMuted} style={styles.sideLabel}>
                            {isLeft ? 'LINKS' : 'RECHTS'}
                        </JempText>
                        <View style={styles.block}>
                            <JempText type="h1" gradient style={styles.display}>
                                {formatTimer(displaySec)}
                            </JempText>
                            {hasTarget && (
                                <View style={[styles.track, { backgroundColor: theme.borderStrong, width: '100%' }]}>
                                    <View style={[styles.fill, { width: `${progress * 100}%` as any }]}>
                                        <LinearGradient colors={[Cyan[500], Electric[500]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                                    </View>
                                </View>
                            )}
                            <View style={styles.actions}>
                                {done ? (
                                    <View style={[styles.btn, { backgroundColor: theme.surface }]}>
                                        <Ionicons name="checkmark-circle" size={18} color={Cyan[500]} />
                                        <JempText type="body-sm" color={Cyan[500]}>Geschafft!</JempText>
                                    </View>
                                ) : !isActiveHere ? (
                                    <Pressable
                                        style={[styles.btn, { backgroundColor: theme.surface }]}
                                        onPress={() => startExerciseTimerSide(side)}
                                        disabled={otherSideActive}
                                    >
                                        <Ionicons name="play" size={18} color={otherSideActive ? theme.textMuted : theme.text} />
                                        <JempText type="body-sm" color={otherSideActive ? theme.textMuted : theme.text}>Start</JempText>
                                    </Pressable>
                                ) : (
                                    <Pressable style={[styles.btn, { backgroundColor: theme.surface }]} onPress={stopExerciseTimerSide}>
                                        <Ionicons name="stop" size={18} color={theme.text} />
                                        <JempText type="body-sm" color={theme.text}>Stop</JempText>
                                    </Pressable>
                                )}
                                {sideDuration > 0 && !isActiveHere && !done && (
                                    <Pressable style={[styles.resetBtn, { backgroundColor: theme.surface }]} onPress={() => setSideDuration(0)}>
                                        <Ionicons name="refresh" size={16} color={theme.textMuted} />
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    rows: { gap: 16 },
    row: { gap: 8 },
    sideLabel: { letterSpacing: 1.5 },
    block: { alignItems: 'center', gap: 12, paddingVertical: 8 },
    display: { fontSize: 48, lineHeight: 56 },
    track: { width: '100%', height: 3, borderRadius: 2, overflow: 'hidden' },
    fill: { height: 3, borderRadius: 2, overflow: 'hidden' },
    actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    btn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 100, paddingHorizontal: 28, paddingVertical: 14 },
    resetBtn: { borderRadius: 100, padding: 12 },
});
