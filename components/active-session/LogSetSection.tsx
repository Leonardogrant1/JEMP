import { DurationSet } from '@/components/active-session/DurationSet';
import { LoadSet } from '@/components/active-session/LoadSet';
import { UniDurationSet } from '@/components/active-session/UniDurationSet';
import { UniLoadSet } from '@/components/active-session/UniLoadSet';
import { JempText } from '@/components/jemp-text';
import { Colors } from '@/constants/theme';
import { loadUnit } from '@/helpers/format';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSessionTransition } from '@/providers/active-session-transition-provider';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

export function LogSetSection() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { exerciseIdx, currentSet, setSlideX, setOpacity } = useActiveSessionTransition();
    const allExercises = useActiveSessionUIStore(s => s.allExercises);
    const previousSet = useActiveSessionUIStore(s => s.previousSet);
    const suggestionHint = useActiveSessionUIStore(s => s.suggestionHint);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: setSlideX.value }],
        opacity: setOpacity.value,
    }));

    const current = allExercises[exerciseIdx] ?? null;
    if (!current) return null;

    const totalSets = current.target_sets ?? 1;
    const unit = loadUnit(current.target_load_type);
    const isUnilateral = current.exercise.laterality === 'unilateral';
    const isDuration = current.exercise.measurement_type === 'duration';


    const renderInputs = () => {
        if (isDuration && isUnilateral) return <UniDurationSet />;
        if (isDuration) return <DurationSet />;
        if (isUnilateral) return <UniLoadSet />;
        return <LoadSet />;
    };

    return (
        <Animated.View style={[styles.logSection, animatedStyle]}>
            <JempText type="h2">
                {t('ui.log_set')} {currentSet} / {totalSets}
            </JempText>

            {renderInputs()}

            {previousSet && (
                <JempText type="caption" color={theme.textMuted} style={styles.hint}>
                    {t('ui.previous')}: {
                        isDuration
                            ? previousSet.reps
                            : previousSet.repsRight != null
                                ? `L: ${previousSet.load && unit ? `${previousSet.load} ${unit} × ` : ''}${previousSet.reps}  R: ${previousSet.repsRight}`
                                : `${previousSet.load && unit ? `${previousSet.load} ${unit} × ` : ''}${previousSet.reps} ${t('ui.reps').toLowerCase()}`
                    }
                </JempText>
            )}

            {suggestionHint && !previousSet && (
                <JempText type="caption" color={theme.textMuted} style={styles.hint}>
                    {t('ui.progression_hint' as any, { value: suggestionHint })}
                </JempText>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    logSection: { gap: 12 },
    hint: { textAlign: 'center' },
});
