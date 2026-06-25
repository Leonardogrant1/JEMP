import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSessionStore } from '@/stores/active-session-store';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

type Props = {
    onLogSet: () => void;
    onSkipSet: () => void;
};

export function BottomBar({ onLogSet, onSkipSet }: Props) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const allExercises = useActiveSessionUIStore(s => s.allExercises);
    const exerciseIdx = useActiveSessionStore(s => s.exerciseIdx);
    const currentSet = useActiveSessionStore(s => s.currentSet);
    const isCompleting = useActiveSessionUIStore(s => s.isCompleting);

    const reps = useActiveSessionUIStore(s => s.reps);
    const repsLeft = useActiveSessionUIStore(s => s.repsLeft);
    const repsRight = useActiveSessionUIStore(s => s.repsRight);
    const exerciseDuration = useActiveSessionUIStore(s => s.exerciseDuration);
    const exerciseDurationLeft = useActiveSessionUIStore(s => s.exerciseDurationLeft);
    const exerciseDurationRight = useActiveSessionUIStore(s => s.exerciseDurationRight);

    const current = allExercises[exerciseIdx] ?? null;
    const totalSets = current?.target_sets ?? 1;
    const isLastSet = currentSet >= totalSets;
    const isLastExercise = exerciseIdx === allExercises.length - 1;
    const isUnilateral = current?.exercise.is_unilateral ?? false;
    const isDuration = current?.exercise.measurement_type === 'duration';

    const hasInput = isDuration && isUnilateral
        ? exerciseDurationLeft > 0 || exerciseDurationRight > 0
        : isDuration
            ? exerciseDuration > 0
            : isUnilateral
                ? repsLeft.trim() !== '' || repsRight.trim() !== ''
                : reps.trim() !== '';

    const label = isLastSet && isLastExercise
        ? t('ui.log_and_finish')
        : isLastSet
            ? t('ui.log_and_next')
            : t('ui.log_set_and_next');

    return (
        <View style={[styles.bottomBar, { backgroundColor: theme.background }]}>
            <Pressable
                style={styles.logBtn}
                onPress={onLogSet}
                disabled={!hasInput || isCompleting}
            >
                <LinearGradient
                    colors={hasInput ? [Cyan[500], Electric[500]] : [`${Cyan[500]}40`, `${Electric[500]}40`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.logBtnGradient}
                >
                    {isCompleting
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <JempText type="button" color="#fff">{label}</JempText>
                    }
                </LinearGradient>
            </Pressable>
            <Pressable onPress={onSkipSet} style={styles.skipLink}>
                <JempText type="body-sm" color={theme.textMuted}>{t('ui.skip_set')}</JempText>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    bottomBar: {
        paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12,
        gap: 8, alignItems: 'center',
    },
    logBtn: { borderRadius: 100, overflow: 'hidden', width: '100%' },
    logBtnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
    skipLink: { paddingVertical: 4 },
});
