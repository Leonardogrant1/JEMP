import { TimerRing } from '@/components/active-session/TimerRing';
import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { formatTimer } from '@/helpers/active-session-helpers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSessionTransition } from '@/providers/active-session-transition-provider';
import { useExerciseTimer } from '@/providers/timer-ref-provider';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

/** Ring-Timer für EINE Seite einer unilateralen Übung — die Seite kommt vom Log-Flow. */
export function SideDurationSet({ side }: { side: 'left' | 'right' }) {
    const { t } = useTranslation();
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

    const isLeft = side === 'left';
    const sideDuration = isLeft ? exerciseDurationLeft : exerciseDurationRight;
    const setSideDuration = isLeft ? setExerciseDurationLeft : setExerciseDurationRight;
    const isActiveHere = exerciseTimerActiveSide === side;

    const target = current.target_duration_seconds ?? 0;
    const hasTarget = target > 0;
    const displaySeconds = hasTarget ? Math.max(0, target - sideDuration) : sideDuration;
    const fraction = hasTarget ? Math.max(0, 1 - sideDuration / target) : 1;
    const done = hasTarget && sideDuration >= target;

    return (
        <View style={styles.block}>
            <TimerRing size={200} fraction={fraction}>
                <JempText type="hero" color={GradientMid} style={styles.timerText}>
                    {formatTimer(displaySeconds)}
                </JempText>
            </TimerRing>

            <View style={styles.actions}>
                {done ? (
                    <View style={[styles.btn, { backgroundColor: theme.surface }]}>
                        <Ionicons name="checkmark-circle" size={20} color={GradientMid} />
                        <JempText type="body-l" color={GradientMid}>{t('ui.timer_done')}</JempText>
                    </View>
                ) : !isActiveHere ? (
                    <Pressable style={[styles.btn, { backgroundColor: theme.surface }]} onPress={() => startExerciseTimerSide(side)}>
                        <Ionicons name="play" size={20} color={theme.text} />
                        <JempText type="body-l" color={theme.text}>Start</JempText>
                    </Pressable>
                ) : (
                    <Pressable style={[styles.btn, { backgroundColor: theme.surface }]} onPress={stopExerciseTimerSide}>
                        <Ionicons name="stop" size={20} color={theme.text} />
                        <JempText type="body-l" color={theme.text}>Stop</JempText>
                    </Pressable>
                )}
                {sideDuration > 0 && !isActiveHere && !done && (
                    <Pressable style={[styles.resetBtn, { backgroundColor: theme.surface }]} onPress={() => setSideDuration(0)}>
                        <Ionicons name="refresh" size={18} color={theme.textMuted} />
                    </Pressable>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    block: { alignItems: 'center', gap: 16, paddingVertical: 8 },
    timerText: {
        fontSize: 40,
        lineHeight: 48,
        fontVariant: ['tabular-nums'],
    },
    actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    btn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 100, paddingHorizontal: 28, paddingVertical: 14 },
    resetBtn: { borderRadius: 100, padding: 12 },
});
