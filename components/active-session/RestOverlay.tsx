import { TimerRing } from '@/components/active-session/TimerRing';
import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { formatTimer } from '@/helpers/active-session-helpers';
import { exerciseThumbnailUrl } from '@/helpers/exercise-storage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSessionTransition } from '@/providers/active-session-transition-provider';
import { useRestTimer } from '@/providers/rest-timer-provider';
import { useActiveSessionStore } from '@/stores/active-session-store';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, {
    Easing,
    FadeIn,
    FadeInDown,
    FadeOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RING_SIZE = 240;

/**
 * Vollflächiges Pause-Overlay über der Active Session: Ring-Timer, "Als
 * Nächstes"-Preview und Aktionen. Mountet nur während isResting — der
 * Scroll-Flow darunter bleibt unangetastet.
 */
export function RestOverlay() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const isDark = (colorScheme ?? 'dark') === 'dark';
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id: sessionId } = useLocalSearchParams<{ id: string }>();

    const { stop, addTime } = useRestTimer();
    const restSeconds = useActiveSessionUIStore(s => s.restSeconds);
    const totalRestSeconds = useActiveSessionUIStore(s => s.totalRestSeconds);
    const isResting = useActiveSessionUIStore(s => s.isResting);

    // exerciseIdx/currentSet zeigen beim Timer-Start bereits auf den nächsten
    // Satz; ist die Übung komplett (Satz-Zähler über dem Ziel), kündigt die
    // Pause die nächste Übung an
    const { exerciseIdx, currentSet } = useActiveSessionTransition();
    const allExercises = useActiveSessionUIStore(s => s.allExercises);
    const currentExercise = allExercises[exerciseIdx] ?? null;
    const exerciseDone = currentExercise != null && currentSet > (currentExercise.target_sets ?? 1);
    const next = exerciseDone ? allExercises[exerciseIdx + 1] ?? null : currentExercise;
    const nextSetNumber = exerciseDone ? 1 : currentSet;
    const isNewExercise = nextSetNumber === 1;
    const thumbUrl = next ? exerciseThumbnailUrl(next.exercise.thumbnail_storage_path) : null;

    // Unilateral: in der Pause zwischen den Seiten die nächste Seite ankündigen
    const pendingSets = useActiveSessionStore(s => s.pendingSets);
    const nextSideLabel = !exerciseDone && next?.exercise.laterality === 'unilateral'
        ? t(pendingSets.some(s => s.workout_session_block_exercise_id === next.id && s.set_number === nextSetNumber && s.side === 'left')
            ? 'ui.side_right'
            : 'ui.side_left')
        : null;

    if (!isResting) return null;

    const remainingFraction = totalRestSeconds > 0 ? restSeconds / totalRestSeconds : 0;

    return (
        <Reanimated.View
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(180)}
            style={[styles.overlay, { top: -insets.top }]}
        >
            <BlurView
                intensity={40}
                tint={isDark ? 'dark' : 'light'}
                style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: isDark ? 'rgba(18,20,26,0.8)' : 'rgba(255,255,255,0.8)' },
                ]}
            />

            <Reanimated.View
                entering={FadeInDown.duration(300).easing(Easing.out(Easing.cubic))}
                style={styles.content}
            >
                <JempText type="caption" color={theme.textMuted} style={styles.pauseLabel}>
                    {t('ui.pause').toUpperCase()}
                </JempText>

                <TimerRing size={RING_SIZE} fraction={remainingFraction}>
                    {/* Solid statt gradient: der JempText-Gradient-Pfad ignoriert
                        Custom-Größen und zentriert per Baseline-Trick unsauber;
                        tabular-nums verhindert das Wackeln beim Sekundenwechsel */}
                    <JempText type="hero" color={GradientMid} style={styles.timerText}>
                        {formatTimer(restSeconds)}
                    </JempText>
                </TimerRing>

                {next && (
                    <View style={[styles.nextCard, { backgroundColor: theme.surface }]}>
                        {isNewExercise && thumbUrl && (
                            <Image source={{ uri: thumbUrl }} style={styles.nextThumb} contentFit="cover" />
                        )}
                        <View style={styles.nextText}>
                            <JempText type="caption" color={theme.textMuted} style={styles.nextLabel}>
                                {t('ui.up_next').toUpperCase()}
                            </JempText>
                            <JempText type="body-l" color={theme.text} numberOfLines={1}>
                                {next.exercise.name}
                            </JempText>
                            <JempText type="caption" color={theme.textMuted}>
                                {t('ui.set_of', { current: nextSetNumber, total: next.target_sets ?? 1 })}
                                {nextSideLabel ? ` · ${nextSideLabel}` : ''}
                            </JempText>
                        </View>
                    </View>
                )}

                <View style={styles.actions}>
                    <Pressable
                        style={[styles.actionBtn, { backgroundColor: theme.surface }]}
                        onPress={() => addTime(-30)}
                    >
                        <JempText type="body-sm" color={theme.text}>− 30s</JempText>
                    </Pressable>
                    <Pressable
                        style={[styles.actionBtn, { backgroundColor: theme.surface }]}
                        onPress={() => addTime(30)}
                    >
                        <JempText type="body-sm" color={theme.text}>+ 30s</JempText>
                    </Pressable>
                    <Pressable
                        style={[styles.actionBtn, { backgroundColor: theme.surface }]}
                        onPress={stop}
                    >
                        <JempText type="body-sm" color={theme.textMuted}>{t('ui.skip_set')}</JempText>
                    </Pressable>
                    <Pressable
                        style={[styles.actionBtn, styles.actionBtnIconed, { backgroundColor: theme.surface }]}
                        onPress={() => router.push({ pathname: '/session-rest-adjust', params: { sessionId } })}
                    >
                        <Ionicons name="options-outline" size={15} color={theme.textMuted} />
                        <JempText type="body-sm" color={theme.textMuted}>{t('ui.session_rest_title')}</JempText>
                    </Pressable>
                </View>
            </Reanimated.View>
        </Reanimated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        paddingHorizontal: 24,
    },
    pauseLabel: {
        letterSpacing: 3,
    },
    timerText: {
        fontSize: 52,
        lineHeight: 60,
        fontVariant: ['tabular-nums'],
    },
    nextCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignSelf: 'stretch',
    },
    nextThumb: {
        width: 52,
        height: 52,
        borderRadius: 12,
    },
    nextText: {
        flex: 1,
        gap: 2,
    },
    nextLabel: {
        letterSpacing: 1.5,
    },
    actions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
    },
    actionBtn: {
        borderRadius: 100,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    actionBtnIconed: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
});
