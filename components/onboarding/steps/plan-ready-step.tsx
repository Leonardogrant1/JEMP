import { JempText } from '@/components/jemp-text';
import { CATEGORY_SVG_ICONS } from '@/constants/category-icons';
import { getCategoryLabelShort } from '@/constants/category-labels';
import { getSportLabelI18n } from '@/constants/sports';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

const DURATION_LABELS: Record<string, string> = {
    '30min': '30 min',
    '45min': '45 min',
    '60min': '60 min',
    '90min': '90 min',
};

/**
 * Plan-Teaser vor der Paywall: „Dein Plan steht" mit den ECHTEN Onboarding-
 * Daten (Trainingstage, Dauer, Fokus, Sport, Startlevel) statt generischer
 * Feature-Liste — der Payoff-Moment für die investierten Quiz-Antworten.
 */
export function PlanReadyStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const preferredDays = useOnboardingStore((s) => s.preferred_workout_days);
    const duration = useOnboardingStore((s) => s.preferred_session_duration);
    const targetedCategories = useOnboardingStore((s) => s.targetedCategories);
    const categoryLevels = useOnboardingStore((s) => s.categoryLevels);
    const sportSlug = useOnboardingStore((s) => s.sport_slug);

    useEffect(() => {
        setCanContinue(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const daysPerWeek = (preferredDays ?? []).length;
    const durationLabel = duration ? DURATION_LABELS[duration] ?? duration : '—';
    const topGoal = [...targetedCategories].sort((a, b) => a.priority - b.priority)[0];
    const GoalIcon = topGoal ? CATEGORY_SVG_ICONS[topGoal.slug] : undefined;
    const goalLabel = topGoal ? getCategoryLabelShort(topGoal.slug, t) : '—';
    const sportLabel = getSportLabelI18n(sportSlug, t) ?? '—';
    const startLevel = categoryLevels.length > 0
        ? Math.round(categoryLevels.reduce((sum, c) => sum + c.score, 0) / categoryLevels.length)
        : null;

    const tiles = [
        { icon: <Ionicons name="calendar-outline" size={18} color={GradientMid} />, value: `${daysPerWeek}×`, label: t('onboarding.plan_ready_week_label') },
        { icon: <Ionicons name="time-outline" size={18} color={GradientMid} />, value: durationLabel, label: t('onboarding.plan_ready_duration_label') },
        { icon: GoalIcon ? <GoalIcon width={18} height={18} color={GradientMid} /> : <Ionicons name="flag-outline" size={18} color={GradientMid} />, value: goalLabel, label: t('onboarding.plan_ready_focus_label') },
        { icon: <Ionicons name="basketball-outline" size={18} color={GradientMid} />, value: sportLabel, label: t('onboarding.plan_ready_sport_label') },
    ];

    return (
        <View style={styles.container}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()} style={styles.checkWrap}>
                <LottieView
                    source={require('@/assets/animations/check.json')}
                    autoPlay
                    loop={false}
                    style={styles.check}
                />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(220).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('onboarding.plan_ready_title')}</JempText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(340).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.plan_ready_subtitle')}
                </JempText>
            </Animated.View>

            {/* ── Plan-Karte mit den echten Einstellungen ── */}
            <Animated.View
                entering={FadeInDown.delay(460).duration(500).springify()}
                style={[styles.card, { backgroundColor: theme.surface }]}
            >
                <View style={styles.cardHeader}>
                    <JempText type="caption" color={theme.textMuted} style={styles.cardTitle}>
                        {t('onboarding.plan_ready_card_title').toUpperCase()}
                    </JempText>
                    <JempText type="caption" color={theme.textSubtle}>
                        {t('onboarding.plan_ready_card_hint')}
                    </JempText>
                </View>

                <View style={styles.tileGrid}>
                    {tiles.map((tile, i) => (
                        <View key={i} style={[styles.tile, { backgroundColor: theme.background }]}>
                            <View style={styles.tileHeader}>
                                {tile.icon}
                                <JempText type="caption" color={theme.textMuted}>{tile.label}</JempText>
                            </View>
                            <JempText type="h2" color={theme.text} numberOfLines={1}>{tile.value}</JempText>
                        </View>
                    ))}
                </View>

                {startLevel !== null && (
                    <View style={[styles.levelRow, { backgroundColor: theme.background }]}>
                        <JempText type="body-sm" color={theme.text} style={styles.levelLabel}>
                            {t('onboarding.plan_ready_level_label')}
                        </JempText>
                        <JempText type="body-sm" color={GradientMid}>{startLevel}/100</JempText>
                        <View style={[styles.levelTrack, { backgroundColor: theme.borderDivider }]}>
                            <Animated.View
                                layout={LinearTransition.duration(600)}
                                style={[styles.levelFill, { width: `${startLevel}%` }]}
                            >
                                <LinearGradient
                                    colors={[Cyan[500], Electric[500]]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={StyleSheet.absoluteFill}
                                />
                            </Animated.View>
                        </View>
                    </View>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
        paddingBottom: 24,
    },
    checkWrap: {
        alignItems: 'center',
        marginBottom: 4,
    },
    check: {
        width: 84,
        height: 84,
    },
    title: {
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 28,
    },
    card: {
        borderRadius: 20,
        padding: 16,
        gap: 12,
    },
    cardHeader: {
        gap: 2,
        paddingHorizontal: 4,
    },
    cardTitle: {
        letterSpacing: 1,
    },
    tileGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    tile: {
        width: '48%',
        flexGrow: 1,
        borderRadius: 14,
        padding: 14,
        gap: 8,
    },
    tileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    levelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    levelLabel: {
        fontWeight: '600',
    },
    levelTrack: {
        flex: 1,
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    levelFill: {
        height: '100%',
        borderRadius: 4,
        overflow: 'hidden',
    },
});
