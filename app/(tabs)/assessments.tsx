import { EmptyAssessmentsCard } from '@/components/assessments/EmptyAssessmentsCard';
import { JempText } from '@/components/jemp-text';
import { useTabBarInset } from '@/components/tab-bar';
import { JempDialog } from '@/components/ui/jemp-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { UNIT_LABELS } from '@/constants/assessment-constants';
import { CATEGORY_SVG_ICONS } from '@/constants/category-icons';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { displayMetricValue } from '@/helpers/units';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUnitSystem } from '@/hooks/use-unit-system';
import { useCurrentUser } from '@/providers/current-user-provider';
import { useHasHadPlanQuery } from '@/queries/use-has-had-plan-query';
import { useUserAssessmentsQuery } from '@/queries/use-user-assessments-query';
import { useAssessmentsUiStore } from '@/stores/assessments-ui-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, Extrapolation, interpolate, runOnJS, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// Fixed chip order — data order is not deterministic enough to drive the UI
const CATEGORY_ORDER = ['strength', 'jumps', 'lower_body_plyometrics', 'upper_body_plyometrics', 'mobility'];

const CATEGORY_ANIMATIONS: Record<string, object> = {
    strength: require('@/assets/animations/strength.json'),
    jumps: require('@/assets/animations/jump.json'),
    lower_body_plyometrics: require('@/assets/animations/lower_plyo.json'),
    upper_body_plyometrics: require('@/assets/animations/upper_plyo.json'),
    mobility: require('@/assets/animations/mobility.json'),
};
const categoryOrder = (slug: string) => {
    const i = CATEGORY_ORDER.indexOf(slug);
    return i === -1 ? CATEGORY_ORDER.length : i;
};

export default function AssessmentsScreen() {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile } = useCurrentUser();
    const tabBarInset = useTabBarInset();
    const unitSystem = useUnitSystem();

    const { data: userAssessments, isLoading: assessmentsLoading } = useUserAssessmentsQuery(profile?.id);
    const { data: hasHadPlan, isLoading: hasHadPlanLoading } = useHasHadPlanQuery(profile?.id);
    const isLoading = assessmentsLoading || hasHadPlanLoading;

    const all = userAssessments ?? [];
    const pending = all.filter(ua => ua.status !== 'completed');
    const completedItems = all.filter(ua => ua.status === 'completed');

    const grouped = new Map<string, typeof pending>();
    for (const ua of pending) {
        const slug = ua.assessment.category?.slug ?? 'other';
        if (!grouped.has(slug)) grouped.set(slug, []);
        grouped.get(slug)!.push(ua);
    }
    const categorySlugs = [...grouped.keys()].sort(
        (a, b) => categoryOrder(a) - categoryOrder(b),
    );

    const selected = useAssessmentsUiStore(s => s.selectedCategory);
    const setSelected = useAssessmentsUiStore(s => s.setSelectedCategory);
    const activeSlug = selected && grouped.has(selected.slug)
        ? selected.slug
        : categorySlugs[Math.min(selected?.index ?? 0, categorySlugs.length - 1)];
    const activeItems = activeSlug ? grouped.get(activeSlug)! : [];
    const activeCompleted = completedItems.filter(ua => (ua.assessment.category?.slug ?? 'other') === activeSlug);

    const hasAssessments = pending.length > 0;

    const completed = completedItems.length;
    const total = completed + pending.length;
    const progress = total > 0 ? completed / total : 0;

    // Animate only while focused so the fill visibly grows after returning
    // from a completed assessment instead of finishing behind the detail screen.
    const [isFocused, setIsFocused] = useState(false);
    useFocusEffect(useCallback(() => {
        setIsFocused(true);
        return () => setIsFocused(false);
    }, []));
    const progressSv = useSharedValue(0);
    useEffect(() => {
        if (!isFocused || isLoading) return;
        progressSv.value = withDelay(300, withTiming(progress, { duration: 700, easing: Easing.out(Easing.cubic) }));
    }, [isFocused, isLoading, progress, progressSv]);
    const progressFillStyle = useAnimatedStyle(() => ({ width: `${progressSv.value * 100}%` }));

    // Celebrate when a category's pending count drops to zero compared to the
    // snapshot from the last visit (stored in zustand — survives remounts)
    const completedCategory = useAssessmentsUiStore(s => s.celebrateCategory);
    useEffect(() => {
        if (isLoading || !userAssessments) return;
        const current: Record<string, number> = {};
        for (const ua of userAssessments) {
            if (ua.status === 'completed') continue;
            const slug = ua.assessment.category?.slug ?? 'other';
            current[slug] = (current[slug] ?? 0) + 1;
        }
        const { pendingSnapshot: prev, setPendingSnapshot, setCelebrateCategory } = useAssessmentsUiStore.getState();
        if (prev) {
            const justCompleted = Object.keys(prev).find(slug => prev[slug] > 0 && !current[slug]);
            if (justCompleted) setCelebrateCategory(justCompleted);
        }
        setPendingSnapshot(current);
    }, [isLoading, userAssessments]);

    // Percent label counts up in sync with the bar by reading the same shared value
    const [displayPercent, setDisplayPercent] = useState(0);
    useAnimatedReaction(
        () => Math.round(progressSv.value * 100),
        (value, previous) => {
            if (value !== previous) runOnJS(setDisplayPercent)(value);
        },
    );

    // Collapse the progress header while scrolling: the sticky block keeps the
    // (thinner) bar + chips, the count/percent row folds away.
    const COLLAPSE_DISTANCE = 70;
    const scrollY = useSharedValue(0);
    const scrollHandler = useAnimatedScrollHandler(e => {
        scrollY.value = e.contentOffset.y;
    });
    const progressHeaderStyle = useAnimatedStyle(() => ({
        opacity: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE * 0.7], [1, 0], Extrapolation.CLAMP),
        height: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [34, 0], Extrapolation.CLAMP),
        marginBottom: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [10, 0], Extrapolation.CLAMP),
    }));
    const progressCardStyle = useAnimatedStyle(() => ({
        paddingTop: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [16, 10], Extrapolation.CLAMP),
    }));
    const progressTrackStyle = useAnimatedStyle(() => ({
        height: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [8, 4], Extrapolation.CLAMP),
    }));
    const stickyEdgeStyle = useAnimatedStyle(() => ({
        opacity: interpolate(scrollY.value, [COLLAPSE_DISTANCE * 0.5, COLLAPSE_DISTANCE], [0, 1], Extrapolation.CLAMP),
    }));

    const formatResult = (ua: (typeof all)[number]) => {
        if (ua.result_value == null) return null;
        const unit = ua.assessment.metric?.unit;
        if (unit === 'rating') return `${ua.result_value}/10`;
        const converted = displayMetricValue(ua.result_value, unit, unitSystem);
        const unitLabel = UNIT_LABELS[converted.unit ?? '']?.[locale === 'de' ? 'de' : 'en'] ?? converted.unit ?? '';
        return `${converted.value} ${unitLabel}`.trim();
    };

    const header = (
        <View style={styles.headerSection}>
            <JempText type="h1" style={styles.title}>{t('tab.assessments')}</JempText>
            <JempText type="body-sm" color={theme.textMuted}>
                {t('ui.assessments_subtitle')}
            </JempText>
        </View>
    );

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            {isLoading ? (
                <>
                    {header}
                    <View style={styles.progressCard}>
                        <View style={[styles.progressHeader, styles.skeletonProgressHeader]}>
                            <Skeleton width={110} height={16} />
                            <Skeleton width={54} height={24} />
                        </View>
                        <Skeleton height={8} borderRadius={4} />
                    </View>
                    <View style={styles.skeletonChipRow}>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} width={i === 0 ? 104 : 88} height={38} borderRadius={999} />
                        ))}
                    </View>
                    <View style={styles.skeletonCards}>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} height={68} borderRadius={14} />
                        ))}
                    </View>
                </>
            ) : !hasAssessments ? (
                <>
                    {header}
                    <EmptyAssessmentsCard allDone={!!hasHadPlan} />
                </>
            ) : (
                <Animated.ScrollView
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    stickyHeaderIndices={[1]}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: tabBarInset }}
                >
                    {header}

                    {/* Sticky block: (collapsing) progress bar + chips */}
                    <View style={{ backgroundColor: theme.background }}>
                        <Animated.View style={[styles.progressCard, progressCardStyle]}>
                            <Animated.View style={[styles.progressHeader, progressHeaderStyle]}>
                                <JempText type="body-sm" color={GradientMid}>
                                    {t('ui.assessments_progress_count', { completed, total })}
                                </JempText>
                                <JempText type="h2" gradient>
                                    {`${displayPercent}%`}
                                </JempText>
                            </Animated.View>
                            <Animated.View style={[styles.progressTrack, { backgroundColor: theme.surface }, progressTrackStyle]}>
                                <Animated.View style={[styles.progressFill, progressFillStyle]}>
                                    <LinearGradient
                                        colors={[Cyan[500], Electric[500]]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                </Animated.View>
                            </Animated.View>
                        </Animated.View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.chipRow}
                            style={styles.chipScroll}
                        >
                            {categorySlugs.map((slug, index) => {
                                const isActive = slug === activeSlug;
                                const label = t(`category.${slug}_short`, {
                                    defaultValue: t(`category.${slug}`, { defaultValue: slug }),
                                });
                                const count = grouped.get(slug)!.length;
                                const ChipIcon = CATEGORY_SVG_ICONS[slug];
                                const content = (
                                    <>
                                        {ChipIcon && <ChipIcon width={14} height={14} color={isActive ? '#fff' : theme.textMuted} />}
                                        <JempText type="body-sm" color={isActive ? '#fff' : theme.textMuted} style={styles.chipLabel}>
                                            {label}
                                        </JempText>
                                        <View style={[styles.chipCount, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : theme.background }]}>
                                            <JempText type="body-sm" color={isActive ? '#fff' : theme.textMuted}>
                                                {count}
                                            </JempText>
                                        </View>
                                    </>
                                );
                                return (
                                    <Pressable key={slug} onPress={() => setSelected({ slug, index })}>
                                        {isActive ? (
                                            <LinearGradient
                                                colors={[Cyan[500], Electric[500]]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={styles.chip}
                                            >
                                                {content}
                                            </LinearGradient>
                                        ) : (
                                            <View style={[styles.chip, { backgroundColor: theme.surface }]}>
                                                {content}
                                            </View>
                                        )}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                        <Animated.View style={[styles.stickyEdge, { backgroundColor: theme.borderDivider }, stickyEdgeStyle]} />
                    </View>

                    <View style={[styles.scroll, styles.section]}>
                        {activeItems.map(ua => (
                            <Pressable
                                key={ua.id}
                                style={[styles.card, { backgroundColor: theme.surface }]}
                                onPress={() => router.push(`/assessment/${ua.id}`)}
                            >
                                <View style={[styles.circle, { borderColor: theme.borderStrong }]} />
                                <View style={styles.cardText}>
                                    <JempText type="body-l" color={theme.textMuted} style={styles.cardTitle}>
                                        {(ua.assessment.name_i18n as Record<string, string> | null)?.[locale] ?? ua.assessment.name}
                                    </JempText>
                                    <JempText type="body-sm" color={theme.textSubtle}>
                                        {t('ui.assessment_not_attempted')}
                                    </JempText>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                            </Pressable>
                        ))}

                        {activeCompleted.map(ua => {
                            const result = formatResult(ua);
                            return (
                                <View key={ua.id} style={[styles.card, { backgroundColor: theme.surface }]}>
                                    <LinearGradient
                                        colors={[Cyan[500], Electric[500]]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.circleFilled}
                                    >
                                        <Ionicons name="checkmark" size={14} color="#fff" />
                                    </LinearGradient>
                                    <View style={styles.cardText}>
                                        <JempText type="body-l" color={theme.text} style={styles.cardTitle}>
                                            {(ua.assessment.name_i18n as Record<string, string> | null)?.[locale] ?? ua.assessment.name}
                                        </JempText>
                                        {result != null && (
                                            <JempText type="body-sm" color={theme.textSubtle}>
                                                {t('ui.assessment_result', { value: result })}
                                            </JempText>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </Animated.ScrollView>
            )}

            <JempDialog
                visible={completedCategory != null && isFocused}
                title={completedCategory
                    ? t('ui.category_completed_title', {
                        category: t(`category.${completedCategory}`, { defaultValue: completedCategory }),
                    })
                    : ''}
                message={t('ui.category_completed_body')}
                buttonLabel={t('ui.got_it')}
                animationSource={(completedCategory && CATEGORY_ANIMATIONS[completedCategory]) || require('@/assets/animations/boxingbag.json')}
                onDismiss={() => useAssessmentsUiStore.getState().setCelebrateCategory(null)}
            />
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },
    headerSection: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 4 },
    scroll: { paddingHorizontal: 20, paddingBottom: 32 },
    stickyEdge: { height: StyleSheet.hairlineWidth },
    title: { letterSpacing: -0.5 },
    skeletonProgressHeader: { marginBottom: 10 },
    skeletonChipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
    skeletonCards: { paddingHorizontal: 20, paddingTop: 8, gap: 8 },

    progressCard: {
        borderRadius: 14,
        padding: 16,
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
    },
    progressTrack: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
        overflow: 'hidden',
    },

    chipScroll: { flexGrow: 0, flexShrink: 0 },
    chipRow: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    chipLabel: { fontWeight: '600' },
    chipCount: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },

    section: { gap: 8, paddingTop: 8 },

    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    circle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1.5,
    },
    circleFilled: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardText: { flex: 1, gap: 2 },
    cardTitle: { fontWeight: '600' },
});
