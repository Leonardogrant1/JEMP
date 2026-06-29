import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRestTimer } from '@/providers/rest-timer-provider';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

function formatTimer(s: number) {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function RestTimerCard() {
    const { stop, addTime } = useRestTimer();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const restSeconds = useActiveSessionUIStore(s => s.restSeconds);
    const totalRestSeconds = useActiveSessionUIStore(s => s.totalRestSeconds);
    const isResting = useActiveSessionUIStore(s => s.isResting);

    if (!isResting) return null;

    return (
        <View style={[styles.timerCard, { backgroundColor: theme.surface }]}>
            <JempText type="caption" color={theme.textMuted} style={styles.timerLabel}>
                PAUSE
            </JempText>
            <JempText type="hero" gradient style={styles.timerDisplay}>
                {formatTimer(restSeconds)}
            </JempText>
            <View style={[styles.timerTrack, { backgroundColor: theme.borderStrong }]}>
                <View
                    style={[
                        styles.timerFill,
                        {
                            width: `${totalRestSeconds > 0
                                ? (1 - restSeconds / totalRestSeconds) * 100
                                : 100}%` as any,
                        },
                    ]}
                >
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
                    onPress={() => addTime(30)}
                >
                    <JempText type="body-sm" color={theme.text}>+ 30s</JempText>
                </Pressable>
                <Pressable style={[styles.timerSkip, { backgroundColor: theme.surface }]} onPress={stop}>
                    <JempText type="body-sm" color={theme.textMuted}>Überspringen</JempText>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    timerCard: {
        alignItems: 'center', gap: 14, paddingVertical: 24, paddingHorizontal: 24,
        borderRadius: 20, borderWidth: 1, borderColor: GradientMid + '55',
    },
    timerLabel: { letterSpacing: 2 },
    timerDisplay: { fontSize: 64, lineHeight: 72 },
    timerTrack: { width: '100%', height: 3, borderRadius: 2, overflow: 'hidden' },
    timerFill: { height: 3, borderRadius: 2, overflow: 'hidden' },
    timerActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    timerBtn: { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
    timerSkip: { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
});
