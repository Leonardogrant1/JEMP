import { JempText } from '@/components/jemp-text';
import { AllCategoryStats } from '@/components/progress/all-category-stats';
import { AssessmentRow } from '@/components/progress/assessment-row';
import { CategoryDropdown } from '@/components/progress/category-dropdown';
import { GaugeCard } from '@/components/progress/gauge-card';
import { TrajectoryChart } from '@/components/progress/trajectory-chart';
import { ALL_STAT_SLUGS, CHART_HEIGHT, TIME_FRAMES } from '@/constants/progress-constants';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { computeTrend, timeFrameToSince } from '@/helpers/progress-helpers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { useCategoryAssessmentsQuery } from '@/queries/use-category-assessments-query';
import { useUserCategoryHistoryQuery } from '@/queries/use-user-category-history-query';
import { useUserCategoryLevelsQuery } from '@/queries/use-user-category-levels-query';
import { TimeFrame } from '@/types/progress-types';
import { devLog } from '@/utils/dev-log';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Pressable, ScrollView,
    StyleSheet,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function ProgressScreen() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile } = useCurrentUser();

    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [timeFrame, setTimeFrame] = useState<TimeFrame>('3M');

    const since = useMemo(() => timeFrameToSince(timeFrame), [timeFrame]);

    const { data: categoryLevels, isLoading: levelsLoading } = useUserCategoryLevelsQuery(profile?.id);
    const { data: historyData, isLoading: historyLoading } = useUserCategoryHistoryQuery(profile?.id, since);
    const { data: assessmentEntries, isLoading: assessmentsLoading } = useCategoryAssessmentsQuery(
        profile?.id,
        selectedCategory !== 'all' ? selectedCategory : undefined,
        since,
    );
    const isLoading = levelsLoading || historyLoading || (selectedCategory !== 'all' && assessmentsLoading);

    const chartData = useMemo(() => {
        if (!historyData) return [];
        if (selectedCategory !== 'all') return historyData[selectedCategory] ?? [];

        // Prefer DB-stored overall (NULL category_id → 'all')
        if (historyData['all']?.length) return historyData['all'];

        // Fallback: compute running average client-side from per-category data
        const all: { slug: string; score: number; recordedAt: string }[] = [];
        for (const [slug, points] of Object.entries(historyData)) {
            if (slug === 'all') continue;
            for (const p of points) all.push({ slug, ...p });
        }
        if (!all.length) return [];
        all.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
        const current = new Map<string, number>();
        return all.map(pt => {
            current.set(pt.slug, pt.score);
            const avg = Math.round([...current.values()].reduce((a, b) => a + b, 0) / current.size);
            return { score: avg, recordedAt: pt.recordedAt };
        });
    }, [historyData, selectedCategory]);

    const trend = useMemo(() => computeTrend(chartData), [chartData]);
    devLog('[progress] selectedCategory:', selectedCategory, '| chartData.length:', chartData.length, '| historyData keys:', Object.keys(historyData ?? {}));

    const visibleStats = useMemo(() => {
        if (selectedCategory !== 'all') return ALL_STAT_SLUGS.filter(s => s === selectedCategory);
        return ALL_STAT_SLUGS;
    }, [selectedCategory]);

    const overallScore = useMemo(() => {
        if (!categoryLevels) return null;
        const scores = ALL_STAT_SLUGS.map(s => categoryLevels[s]).filter((v): v is number => v !== undefined);
        if (!scores.length) return null;
        return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }, [categoryLevels]);

    const categoryTrends = useMemo(() => {
        const result: Record<string, number | null> = {};
        for (const slug of ALL_STAT_SLUGS) {
            result[slug] = computeTrend(historyData?.[slug] ?? []);
        }
        return result;
    }, [historyData]);

    const overallTrend = useMemo(() => computeTrend(historyData?.['all'] ?? []), [historyData]);

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={styles.headerSection}>
                <JempText type="h1" style={styles.title}>{t('tab.progress')}</JempText>

                <View style={styles.controlsRow}>
                    <CategoryDropdown selected={selectedCategory} onSelect={setSelectedCategory} />
                    <View style={[styles.timeToggle, { backgroundColor: theme.surface }]}>
                        {TIME_FRAMES.map(tf => {
                            const active = tf === timeFrame;
                            return (
                                <Pressable
                                    key={tf}
                                    onPress={() => setTimeFrame(tf)}
                                    style={[styles.timeBtn, active && styles.timeBtnActive]}
                                >
                                    {active && (
                                        <LinearGradient
                                            colors={[Cyan[500], Electric[500]]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    )}
                                    <JempText type="button" color={active ? '#fff' : theme.textMuted}>
                                        {tf}
                                    </JempText>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </View>

            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={theme.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    {/* Development chart */}
                    <View style={[styles.trajCard, { backgroundColor: theme.surface }]}>
                        <View style={styles.trajHeader}>
                            <JempText type="h2">{t('ui.progress_development')}</JempText>
                            {trend !== null && (
                                <View style={styles.trendBadge}>
                                    <Ionicons
                                        name={trend >= 0 ? 'trending-up' : 'trending-down'}
                                        size={14}
                                        color={trend >= 0 ? Cyan[400] : '#ef4444'}
                                    />
                                    <JempText
                                        type="caption"
                                        color={trend >= 0 ? Cyan[400] : '#ef4444'}
                                        style={styles.trendText}
                                    >
                                        {trend >= 0 ? '+' : ''}{trend}
                                    </JempText>
                                </View>
                            )}
                        </View>
                        <TrajectoryChart data={chartData} emptyLabel={t('ui.progress_no_history')} />
                    </View>

                    {/* Category Stats */}
                    {(visibleStats.length > 0 || overallScore !== null) && (
                        <View style={styles.statsSection}>
                            {selectedCategory === 'all' && (
                                <JempText type="h2">{t('ui.progress_category_stats')}</JempText>
                            )}
                            {selectedCategory === 'all' ? (
                                <AllCategoryStats
                                    levels={categoryLevels ?? {}}
                                    trends={categoryTrends}
                                    overallScore={overallScore}
                                    overallTrend={overallTrend}
                                />
                            ) : (
                                <View style={styles.statsGrid}>
                                    {visibleStats.map(slug => (
                                        <GaugeCard
                                            key={slug}
                                            slug={slug}
                                            value={categoryLevels?.[slug]}
                                            trend={categoryTrends[slug] ?? null}
                                            style={visibleStats.length === 1 ? { width: '100%' } : undefined}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Assessments — only when a specific category is selected */}
                    {selectedCategory !== 'all' && (
                        <View style={styles.assessSection}>
                            <JempText type="h2">{t('ui.progress_assessments')}</JempText>
                            {assessmentEntries && assessmentEntries.length > 0 ? (
                                assessmentEntries.map(entry => (
                                    <AssessmentRow
                                        key={entry.assessmentId}
                                        entry={entry}
                                        categorySlug={selectedCategory}
                                    />
                                ))
                            ) : (
                                <View style={styles.assessEmpty}>
                                    <JempText type="caption" color={theme.textMuted}>
                                        {t('ui.progress_no_assessments')}
                                    </JempText>
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}


const styles = StyleSheet.create({
    root: { flex: 1 },
    headerSection: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
    title: { letterSpacing: -0.5, marginBottom: 12 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: 20, paddingBottom: 32, gap: 20, paddingTop: 15 },

    controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

    dropdownBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 100,
        gap: 6,
    },
    dropdownLabel: { flex: 1 },

    timeToggle: {
        flexDirection: 'row',
        borderRadius: 100,
        overflow: 'hidden',
        padding: 3,
        gap: 2,
    },
    timeBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 100,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeBtnActive: {},

    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        paddingHorizontal: 16,
        gap: 2,
    },
    modalHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 12,
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
    },

    trajCard: {
        borderRadius: 20,
        padding: 16,
        paddingBottom: 8,
        gap: 4,
    },
    trajHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    trendText: { fontWeight: '600' },
    chartEmpty: {
        height: CHART_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartValueRow: {
        position: 'absolute',
        bottom: 4,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    chartValueLabel: { fontSize: 11, opacity: 0.7 },
    chartValueLabelEnd: { opacity: 1 },

    assessSection: { gap: 10 },
    assessRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 8,
    },
    assessLeft: { flex: 1, gap: 2 },
    assessName: { fontSize: 15 },
    assessRight: { alignItems: 'flex-end', gap: 4 },
    scorePill: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
    },
    scoreText: { fontWeight: '600', fontSize: 13 },
    deltaText: { fontWeight: '500', fontSize: 12 },
    assessEmpty: { paddingVertical: 20, alignItems: 'center' },

    // Gauge grid card
    gaugeCard: {
        width: '48.25%',
        borderRadius: 16,
        padding: 14,
        paddingBottom: 14,
        gap: 0,
        overflow: 'hidden',
    },
    gaugeCardCircle: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 8,
        paddingBottom: 4,
    },
    gaugeCenter: { alignItems: 'center', justifyContent: 'center' },
    gaugeCardScore: { fontSize: 24, lineHeight: 28, fontWeight: '700', letterSpacing: -0.5 },
    miniGaugeScore: { fontSize: 12, fontWeight: '700', letterSpacing: -0.3 },

    overallCard: {
        borderRadius: 16,
        padding: 14,
        gap: 8,
        overflow: 'hidden',
    },
    overallCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    overallGaugeWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    overallScore: { fontSize: 40, lineHeight: 46, letterSpacing: -1.5 },
    overallLeft: { gap: 2 },
    overallValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

    statCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    statsSection: { gap: 12 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCard: {
        width: '48.25%',
        borderRadius: 16,
        padding: 14,
        paddingBottom: 0,
        gap: 6,
        overflow: 'hidden',
    },
    statHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statLabel: { fontSize: 11, letterSpacing: 0.3 },
    statValue: { fontSize: 32, lineHeight: 38, letterSpacing: -1, paddingBottom: 10 },
    progressTrack: { height: 4, borderRadius: 2, marginBottom: 14, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },
});
