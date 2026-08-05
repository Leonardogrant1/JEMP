import { useLogSet } from '@/components/active-session/use-log-set';
import { JempText } from '@/components/jemp-text';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSessionTransition } from '@/providers/active-session-transition-provider';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export function BottomBar() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const insets = useSafeAreaInsets();

    const { exerciseIdx, currentSet, saveProgress } = useActiveSessionTransition();
    const { advanceExercise, completeSession, allLogged, isCompleting, isLastExercise, isFinish } = useLogSet();

    const setReps = useActiveSessionUIStore(s => s.setReps);
    const allExercises = useActiveSessionUIStore(s => s.allExercises);
    const nextExerciseName = allExercises[exerciseIdx + 1]?.exercise.name ?? '';

    // Als Icon-FAB ist der Skip schnell versehentlich getroffen — immer rückfragen
    const [confirmMode, setConfirmMode] = useState<'skip' | 'finish' | null>(null);

    const handleSkipSet = useCallback(() => {
        setConfirmMode(isFinish ? 'finish' : 'skip');
    }, [isFinish]);

    const handleConfirmSkip = useCallback(() => {
        setConfirmMode(null);
        if (confirmMode === 'finish') {
            completeSession();
        } else {
            // Auch der letzte Satz bleibt in der Übung — weiter geht's per FAB
            saveProgress(exerciseIdx, currentSet + 1);
            setReps('');
        }
    }, [confirmMode, exerciseIdx, currentSet, saveProgress, completeSession, setReps]);

    const handleFabPress = useCallback(() => {
        if (allLogged) advanceExercise();
    }, [allLogged, advanceExercise]);

    return (
        // Floating Actions: Skip-Ghost solange Sätze offen sind; sind alle
        // eingetragen, erscheint stattdessen die Weiter-Pill mit dem Namen
        // der nächsten Übung (bzw. "Abschließen" am Ende)
        <View style={[styles.fabWrap, { bottom: insets.bottom + 20 }]} pointerEvents="box-none">
            {!allLogged ? (
                <Pressable
                    onPress={handleSkipSet}
                    style={[styles.skipFab, { backgroundColor: theme.surface }]}
                    hitSlop={4}
                >
                    <Ionicons name="play-skip-forward" size={18} color={theme.textMuted} />
                </Pressable>
            ) : (
                <Reanimated.View entering={FadeInDown.duration(220)}>
                    <Pressable
                        style={styles.nextPill}
                        onPress={handleFabPress}
                        disabled={isCompleting}
                    >
                        <LinearGradient
                            colors={[Cyan[500], Electric[500]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.nextPillGradient}
                        >
                            {isCompleting ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <JempText type="button" color="#fff" numberOfLines={1} style={styles.nextPillLabel}>
                                        {isLastExercise ? t('ui.finish') : nextExerciseName}
                                    </JempText>
                                    <Ionicons name={isLastExercise ? 'flag' : 'arrow-forward'} size={18} color="#fff" />
                                </>
                            )}
                        </LinearGradient>
                    </Pressable>
                </Reanimated.View>
            )}

            <ConfirmDialog
                visible={confirmMode !== null}
                title={confirmMode === 'finish' ? t('ui.finish_session_title') : t('ui.skip_set_confirm_title')}
                message={confirmMode === 'finish' ? t('ui.finish_session_message') : t('ui.skip_set_confirm_body')}
                confirmLabel={confirmMode === 'finish' ? t('ui.finish') : t('ui.skip_set')}
                destructive={confirmMode === 'finish'}
                onConfirm={handleConfirmSkip}
                onClose={() => setConfirmMode(null)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    fabWrap: {
        position: 'absolute',
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    skipFab: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nextPill: {
        borderRadius: 100,
        overflow: 'hidden',
        shadowColor: Cyan[500],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    nextPillGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 52,
        paddingHorizontal: 22,
    },
    nextPillLabel: {
        maxWidth: 220,
    },
});
