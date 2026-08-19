import { JempText } from '@/components/jemp-text';
import { useTabBarInset } from '@/components/tab-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { AssessmentRow } from '@/components/progress/assessment-row';
import { CategoryStatGrid } from '@/components/progress/category-stat-grid';
import { ProgressHeroCard } from '@/components/progress/progress-hero-card';
import { getCategoryLabelShort } from '@/constants/category-labels';
import { ALL_STAT_SLUGS, TIME_FRAMES } from '@/constants/progress-constants';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { computeTrend, timeFrameToSince } from '@/helpers/progress-helpers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { useCategoryAssessmentsQuery } from '@/queries/use-category-assessments-query';
import { useDevToolsStore } from '@/stores/dev-tools-store';
import { useUserCategoryHistoryQuery } from '@/queries/use-user-category-history-query';
import { useUserCategoryLevelsQuery } from '@/queries/use-user-category-levels-query';
import { TimeFrame } from '@/types/progress-types';
import { devLog } from '@/utils/dev-log';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Pressable, ScrollView,
    StyleSheet,
    View
} from 'react-native';
import Reanimated, { FadeInLeft, FadeOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function ProgressScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile } = useCurrentUser();
    const tabBarInset = useTabBarInset();

    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [timeFrame, setTimeFrame] = useState<TimeFrame>('3M');
    const hideSparklineData = useDevToolsStore(s => s.hideSparklineData);
    const hideHistory = __DEV__ && hideSparklineData;

    const since = useMemo(() => timeFrameToSince(timeFrame), [timeFrame]);

    const { data: categoryLevels, isLoading: levelsLoading } = useUserCategoryLevelsQuery(profile?.id);
    const { data: historyData, isLoading: historyLoading } = useUserCategoryHistoryQuery(profile?.id, since);
    const { data: assessmentEntries, isLoading: assessmentsLoading } = useCategoryAssessmentsQuery(
        profile?.id,
        selectedCategory !== 'all' ? selectedCategory : undefined,
        since,
    );
    const isLoading = levelsLoading || historyLoading;

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

    const heroLabel = selectedCategory === 'all'
        ? t('category.overall')
        : getCategoryLabelShort(selectedCategory, t);
    const heroScore = selectedCategory === 'all'
        ? overallScore
        : categoryLevels?.[selectedCategory] ?? null;

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={styles.headerSection}>
                <View style={styles.headerRow}>
                    <View style={styles.titleRow}>
                        {selectedCategory !== 'all' ? (
                            <Reanimated.View key="back" entering={FadeInLeft.duration(250)} exiting={FadeOutLeft.duration(150)}>
                                <Pressable onPress={() => setSelectedCategory('all')} hitSlop={12} style={styles.backBtn}>
                                    <Ionicons name="arrow-back" size={26} color={theme.text} />
                                </Pressable>
                            </Reanimated.View>
                        ) : (
                            <Reanimated.View key="title" entering={FadeInLeft.duration(250)} exiting={FadeOutLeft.duration(150)} style={styles.titleWrap}>
                                <JempText type="h1" style={styles.title} numberOfLines={1}>{t('ui.progress_title')}</JempText>
                            </Reanimated.View>
                        )}
                    </View>
                    <View style={[styles.timeToggle, { backgroundColor: theme.surface }]}>
                        {TIME_FRAMES.map(tf => {
                            const active = tf === timeFrame;
                            return (
                                <Pressable
                                    key={tf}
                                    onPress={() => setTimeFrame(tf)}
                                    style={styles.timeBtn}
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
                <View style={styles.scroll}>
                    <Skeleton height={250} borderRadius={20} />
                    {selectedCategory === 'all' ? (
                        <View style={styles.skeletonGrid}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} width="48.25%" height={116} borderRadius={16} />
                            ))}
                        </View>
                    ) : (
                        <View style={styles.assessSection}>
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} height={92} borderRadius={14} />
                            ))}
                        </View>
                    )}
                </View>
            ) : (
                <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarInset }]} showsVerticalScrollIndicator={false}>
                    <ProgressHeroCard
                        label={heroLabel}
                        score={heroScore}
                        trend={hideHistory ? null : trend}
                        chartData={hideHistory ? [] : chartData}
                        emptyLabel={t('ui.progress_no_history')}
                        ctaLabel={t('ui.progress_empty_cta')}
                        onCtaPress={() => router.navigate('/(tabs)/assessments')}
                    />

                    {selectedCategory === 'all' && (
                        <CategoryStatGrid
                            levels={categoryLevels ?? {}}
                            trends={hideHistory ? {} : categoryTrends}
                            history={hideHistory ? {} : historyData ?? {}}
                            selected={selectedCategory}
                            onSelect={setSelectedCategory}
                        />
                    )}

                    {/* Assessments — only when a specific category is selected */}
                    {selectedCategory !== 'all' && (
                        <View style={styles.assessSection}>
                            <JempText type="h2">{t('ui.progress_assessments')}</JempText>
                            {assessmentsLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} height={92} borderRadius={14} />
                                ))
                            ) : assessmentEntries && assessmentEntries.length > 0 ? (
                                assessmentEntries.map((entry, index) => (
                                    <AssessmentRow
                                        key={entry.assessmentId}
                                        entry={hideHistory
                                            ? { ...entry, history: [], percentChange: null, firstValue: null }
                                            : entry}
                                        categorySlug={selectedCategory}
                                        index={index}
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
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 40 },
    titleWrap: { flexShrink: 1 },
    backBtn: { marginLeft: -4 },
    title: { letterSpacing: -0.5, flexShrink: 1 },
    scroll: { paddingHorizontal: 20, paddingBottom: 32, gap: 20, paddingTop: 15 },
    skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

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

    assessSection: { gap: 10 },
    assessEmpty: { paddingVertical: 20, alignItems: 'center' },
});
