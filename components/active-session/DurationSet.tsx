import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, GRADIENT } from '@/constants/theme';
import { formatTimer } from '@/helpers/active-session-helpers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSessionTransition } from '@/providers/active-session-transition-provider';
import { useExerciseTimer } from '@/providers/timer-ref-provider';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

export function DurationSet() {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { exerciseIdx } = useActiveSessionTransition();
    const allExercises = useActiveSessionUIStore(s => s.allExercises);
    const current = allExercises[exerciseIdx] ?? null;

    const { exerciseDuration, exerciseTimeIsActive, startExerciseTimer, stopExerciseTimer, setExerciseDuration } = useExerciseTimer();

    if (!current) return null;

    const target = current.target_duration_seconds ?? 0;
    const hasTarget = target > 0;
    const displaySeconds = hasTarget ? Math.max(0, target - exerciseDuration) : exerciseDuration;
    const progress = hasTarget ? Math.min(exerciseDuration / target, 1) : 0;
    const done = hasTarget && exerciseDuration >= target;

    return (
        <View style={styles.block}>
            <JempText type="hero" gradient style={styles.display}>
                {formatTimer(displaySeconds)}
            </JempText>
            {hasTarget && (
                <View style={[styles.track, { backgroundColor: theme.borderStrong }]}>
                    <View style={[styles.fill, { width: `${progress * 100}%` as any }]}>
                        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    </View>
                </View>
            )}
            <View style={styles.actions}>
                {done ? (
                    <View style={[styles.btn, { backgroundColor: theme.surface }]}>
                        <Ionicons name="checkmark-circle" size={20} color={Cyan[500]} />
                        <JempText type="body-l" color={Cyan[500]}>Geschafft!</JempText>
                    </View>
                ) : !exerciseTimeIsActive ? (
                    <Pressable style={[styles.btn, { backgroundColor: theme.surface }]} onPress={startExerciseTimer}>
                        <Ionicons name="play" size={20} color={theme.text} />
                        <JempText type="body-l" color={theme.text}>Start</JempText>
                    </Pressable>
                ) : (
                    <Pressable style={[styles.btn, { backgroundColor: theme.surface }]} onPress={stopExerciseTimer}>
                        <Ionicons name="stop" size={20} color={theme.text} />
                        <JempText type="body-l" color={theme.text}>Stop</JempText>
                    </Pressable>
                )}
                {exerciseDuration > 0 && !exerciseTimeIsActive && !done && (
                    <Pressable style={[styles.resetBtn, { backgroundColor: theme.surface }]} onPress={() => setExerciseDuration(0)}>
                        <Ionicons name="refresh" size={18} color={theme.textMuted} />
                    </Pressable>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    block: { alignItems: 'center', gap: 12, paddingVertical: 8 },
    display: { fontSize: 72, lineHeight: 80 },
    track: { width: '100%', height: 3, borderRadius: 2, overflow: 'hidden' },
    fill: { height: 3, borderRadius: 2, overflow: 'hidden' },
    actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    btn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 100, paddingHorizontal: 28, paddingVertical: 14 },
    resetBtn: { borderRadius: 100, padding: 12 },
});
