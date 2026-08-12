import { Confetti } from '@/components/confetti';
import { JempText } from '@/components/jemp-text';
import { AchievementDef } from '@/constants/achievements';
import { Colors, GRADIENT } from '@/constants/theme';
import { displayMetricValue, UnitSystem } from '@/helpers/units';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

type AchievementCelebrationProps = {
    visible: boolean;
    unlocks: AchievementDef[];
    unitSystem: UnitSystem;
    onDone: () => void;     // dismiss (assessment screen navigates back)
    onViewAll: () => void;  // dismiss + open the achievements screen
};

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
    const { headline, rest } = useMemo(() => {
        const bySlug = new Map<string, AchievementDef>();
        for (const def of unlocks) bySlug.set(def.assessmentSlug, def);
        const headliners = [...bySlug.values()];
        const headlineSlugs = new Set(headliners.map(d => d.slug));
        return {
            headline: headliners,
            rest: unlocks.filter(d => !headlineSlugs.has(d.slug)),
        };
    }, [unlocks]);

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" visible>
            <View style={styles.backdrop}>
                <Confetti />
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <LottieView
                        autoPlay
                        loop={false}
                        source={require('@/assets/animations/throphy.json')}
                        style={styles.trophy}
                    />
                    <JempText type="h1" style={styles.title}>{t('achievements.celebration_title')}</JempText>

                    {headline.map(def => (
                        <View key={def.slug} style={[styles.badge, { borderColor: '#FFD700' }]}>
                            <JempText type="h2" color="#FFD700">
                                {formatThreshold(def, unitSystem)} {t(`achievements.exercise.${def.assessmentSlug}`)}
                            </JempText>
                        </View>
                    ))}

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
        borderWidth: 1.5,
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 10,
    },
    also: { textAlign: 'center' },
    viewAll: { paddingVertical: 4 },
    continueBtn: { width: '100%', borderRadius: 100, overflow: 'hidden', marginTop: 4 },
    continueGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
});
