import { Confetti } from '@/components/confetti';
import { JempText } from '@/components/jemp-text';
import { AchievementDef, AchievementMedal, MEDAL_COLORS, medalForDef } from '@/constants/achievements';
import { Colors, GRADIENT } from '@/constants/theme';
import { displayMetricValue, UnitSystem } from '@/helpers/units';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView, { AnimationObject } from 'lottie-react-native';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

type AchievementCelebrationProps = {
    visible: boolean;
    unlocks: AchievementDef[];
    unitSystem: UnitSystem;
    onDone: () => void;     // dismiss (assessment screen navigates back)
    onViewAll: () => void;  // dismiss + open the achievements screen
};

const MEDAL_ANIMATIONS: Record<AchievementMedal, AnimationObject> = {
    gold: require('@/assets/animations/achievement_gold.json'),
    silver: require('@/assets/animations/achievement_silver.json'),
    bronze: require('@/assets/animations/achievement_bronze.json'),
    basic: require('@/assets/animations/achievement.json'),
};

const MEDAL_RANK: Record<AchievementMedal, number> = { gold: 3, silver: 2, bronze: 1, basic: 0 };

function formatThreshold(def: AchievementDef, unitSystem: UnitSystem): string {
    const { value, unit } = displayMetricValue(def.threshold, def.unit === 'count' ? 'count' : def.unit, unitSystem);
    const prefix = def.assessmentSlug === 'weighted_pullups_1rm' ? '+' : '';
    if (def.unit === 'count') return `${prefix}${value}×`;
    if (def.unit === 's') return `${prefix}${value}s`;
    return `${prefix}${value} ${unit}`;
}

/** One sheet per completion: the highest new rung per ladder is celebrated big, the rest listed small. */
export function AchievementCelebration({ visible, unlocks, unitSystem, onDone, onViewAll }: AchievementCelebrationProps) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    // Highest rung per assessment ladder (catalog order is ascending within a ladder,
    // so the last unlock per assessmentSlug is the highest one).
    const { headline, rest, medal } = useMemo(() => {
        const bySlug = new Map<string, AchievementDef>();
        for (const def of unlocks) bySlug.set(def.assessmentSlug, def);
        const headliners = [...bySlug.values()];
        const headlineSlugs = new Set(headliners.map(d => d.slug));
        const best = headliners
            .map(medalForDef)
            .reduce<AchievementMedal>((a, b) => (MEDAL_RANK[b] > MEDAL_RANK[a] ? b : a), 'basic');
        return {
            headline: headliners,
            rest: unlocks.filter(d => !headlineSlugs.has(d.slug)),
            medal: best,
        };
    }, [unlocks]);

    // Celebration burst in sync with confetti + medal animation
    useEffect(() => {
        if (!visible) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        const timers = [
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150),
            setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 350),
        ];
        return () => timers.forEach(clearTimeout);
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" visible>
            <View style={styles.backdrop}>
                <Confetti />
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <LottieView
                        autoPlay
                        loop={false}
                        source={MEDAL_ANIMATIONS[medal]}
                        style={styles.trophy}
                    />
                    <JempText type="h1" style={styles.title}>{t('achievements.celebration_title')}</JempText>

                    {headline.map(def => {
                        const color = MEDAL_COLORS[medalForDef(def)];
                        return (
                            <View key={def.slug} style={[styles.badge, { borderColor: color }]}>
                                <Ionicons name="medal-outline" size={16} color={color} />
                                <JempText type="body-l" color={color}>
                                    {formatThreshold(def, unitSystem)} {t(`achievements.exercise.${def.assessmentSlug}`)}
                                </JempText>
                            </View>
                        );
                    })}

                    {rest.length > 0 && (
                        <JempText type="caption" color={theme.textMuted} style={styles.also}>
                            {t('achievements.celebration_also')}: {rest.map(d => formatThreshold(d, unitSystem)).join(' · ')}
                        </JempText>
                    )}

                    <Pressable onPress={onViewAll} style={styles.viewAll}>
                        <JempText type="body-sm" color={theme.textMuted}>{t('achievements.view_all')}</JempText>
                    </Pressable>

                    <Pressable onPress={onDone} style={styles.continueBtn}>
                        <LinearGradient
                            colors={GRADIENT}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.continueGradient}
                        >
                            <JempText type="button" color="#fff">{t('achievements.continue')}</JempText>
                        </LinearGradient>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 28,
    },
    card: {
        width: '100%',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        gap: 14,
    },
    trophy: { width: 110, height: 110 },
    title: { textAlign: 'center' },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderRadius: 100,
        paddingHorizontal: 14,
        paddingVertical: 7,
    },
    also: { textAlign: 'center' },
    viewAll: { paddingVertical: 4 },
    continueBtn: { width: '100%', borderRadius: 100, overflow: 'hidden', marginTop: 4 },
    continueGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
});
