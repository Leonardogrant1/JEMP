import { ExerciseVideoHero } from '@/components/exercise-video-hero';
import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSessionStore } from '@/stores/active-session-store';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { type AnimatedProps } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

type Props = {
    animatedStyle: any;
};

export function ExerciseCard({ animatedStyle }: Props) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const allExercises = useActiveSessionUIStore(s => s.allExercises);
    const exerciseIdx = useActiveSessionStore(s => s.exerciseIdx);
    const current = allExercises[exerciseIdx] ?? null;

    if (!current) return null;

    return (
        <Animated.View style={animatedStyle}>
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

            <ExerciseVideoHero
                key={current.exercise.id}
                videoStoragePath={current.exercise.video_storage_path}
                youtubeUrl={current.exercise.youtube_url}
                thumbnailStoragePath={current.exercise.thumbnail_storage_path}
                exerciseId={current.exercise.id}
            />

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
                                    <JempText type="caption" color="#fff" style={styles.equipmentChipText}>
                                        {label}
                                    </JempText>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    titleLeft: { flex: 1, gap: 6 },
    blockLabel: { letterSpacing: 1.5 },
    equipmentSection: { gap: 12 },
    equipmentLabel: { letterSpacing: 0.5 },
    equipmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    equipmentChip: { borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16, borderWidth: 1, borderColor: GradientMid },
    equipmentChipText: { fontSize: 14, fontWeight: '500' },
});
