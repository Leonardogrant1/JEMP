import { JempText } from '@/components/jemp-text';
import { getCategoryMeta } from '@/constants/categories';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { type CategoryAssessmentEntry, useCategoryAssessmentsQuery } from '@/queries/use-category-assessments-query';
import { type CategoryHistoryPoint, useUserCategoryHistoryQuery } from '@/queries/use-user-category-history-query';
import { useUserCategoryLevelsQuery } from '@/queries/use-user-category-levels-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator, Modal, Pressable, ScrollView,
    StyleSheet, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Path, Svg } from 'react-native-svg';

// ─── Constants ──────────────────────────────────────────────────────────────

const ALL_STAT_SLUGS = [
    'strength',
    'lower_body_plyometrics',
    'upper_body_plyometrics',
    'jumps',
    'mobility',
] as const;

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    strength: 'barbell',
    jumps: 'trending-up',
    lower_body_plyometrics: 'flash',
    upper_body_plyometrics: 'fitness',
    mobility: 'body',
};

const STAT_LABELS: Record<string, string> = {
    strength: 'Strength',
    jumps: 'Jump',
    lower_body_plyometrics: 'Lower Plyo',
    upper_body_plyometrics: 'Upper Plyo',
    mobility: 'Mobility',
};

const DROPDOWN_OPTIONS = [
    { key: 'all', labelKey: 'ui.progress_all_categories' },
    { key: 'strength', labelKey: 'category.strength' },
    { key: 'jumps', labelKey: 'category.jumps' },
    { key: 'lower_body_plyometrics', labelKey: 'category.lower_body_plyometrics' },
    { key: 'upper_body_plyometrics', labelKey: 'category.upper_body_plyometrics' },
    { key: 'mobility', labelKey: 'category.mobility' },
] as const;

const TIME_FRAMES = ['3M', '6M', '1Y'] as const;
type TimeFrame = typeof TIME_FRAMES[number];

const CHART_HEIGHT = 150;
const CHART_PAD_TOP = 12;
const CHART_PAD_BOTTOM = 28;

// ─── Data helpers ────────────────────────────────────────────────────────────

function timeFrameToSince(tf: TimeFrame): string {
    const months = tf === '3M' ? 3 : tf === '6M' ? 6 : 12;
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d.toISOString();
}

function computeTrend(data: CategoryHistoryPoint[]): number | null {
    if (data.length < 2) return null;
    return data[data.length - 1].score - data[0].score;
}

// ─── Trajectory chart ────────────────────────────────────────────────────────

interface TrajectoryChartProps {
    data: CategoryHistoryPoint[];
    emptyLabel: string;
}

function TrajectoryChart({ data, emptyLabel }: TrajectoryChartProps) {
    const [width, setWidth] = useState(0);

    const linePath = useMemo(() => {
        if (width === 0 || data.length < 1) return '';

        const innerH = CHART_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM;
        const scores = data.map(d => d.score);
        const minScore = Math.max(0, Math.min(...scores) - 5);
        const maxScore = Math.min(100, Math.max(...scores) + 5);
        const range = maxScore - minScore || 10;

        const pts = data.map((d, i) => ({
            x: data.length === 1 ? width / 2 : (i / (data.length - 1)) * width,
            y: CHART_PAD_TOP + (1 - (d.score - minScore) / range) * innerH,
        }));

        return pts.reduce((acc, p, i) => {
            if (i === 0) return `M ${p.x} ${p.y}`;
            const prev = pts[i - 1];
            const cp1x = prev.x + (p.x - prev.x) / 3;
            const cp2x = p.x - (p.x - prev.x) / 3;
            return `${acc} C ${cp1x} ${prev.y}, ${cp2x} ${p.y}, ${p.x} ${p.y}`;
        }, '');
    }, [data, width]);

    if (data.length < 1) {
        return (
            <View style={styles.chartEmpty}>
                <JempText type="caption" color="#666">{emptyLabel}</JempText>
            </View>
        );
    }

    const firstScore = data[0].score;
    const lastScore = data[data.length - 1].score;

    return (
        <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ height: CHART_HEIGHT }}>
            {width > 0 && (
                <>
                    <Svg width={width} height={CHART_HEIGHT} style={StyleSheet.absoluteFill}>
                        <Path d={linePath} stroke={Cyan[500]} strokeWidth={14} fill="none" strokeOpacity={0.06} strokeLinecap="round" />
                        <Path d={linePath} stroke={Cyan[500]} strokeWidth={7} fill="none" strokeOpacity={0.12} strokeLinecap="round" />
                        <Path d={linePath} stroke={Cyan[400]} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                    {/* Start / end value labels */}
                    <View style={styles.chartValueRow} pointerEvents="none">
                        <JempText type="caption" color="#666" style={styles.chartValueLabel}>
                            {firstScore}
                        </JempText>
                        <JempText type="caption" color={Cyan[400]} style={[styles.chartValueLabel, styles.chartValueLabelEnd]}>
                            {lastScore}
                        </JempText>
                    </View>
                </>
            )}
        </View>
    );
}

// ─── Shared trend badge ──────────────────────────────────────────────────────

function TrendBadge({ trend, light }: { trend: number; light?: boolean }) {
    const up = trend >= 0;
    const color = light ? 'rgba(255,255,255,0.9)' : up ? Cyan[400] : '#ef4444';
    return (
        <View style={styles.trendBadge}>
            <Ionicons name={up ? 'trending-up' : 'trending-down'} size={12} color={color} />
            <JempText type="caption" color={color} style={styles.trendText}>
                {up ? `+${trend}` : String(trend)}
            </JempText>
        </View>
    );
}

// ─── Stat card ───────────────────────────────────────────────────────────────

interface StatCardProps {
    slug: string;
    value: number | undefined;
    trend: number | null;
}

function StatCard({ slug, value, trend }: StatCardProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const icon = CATEGORY_ICONS[slug] ?? 'fitness';
    const label = STAT_LABELS[slug] ?? slug;
    const hasValue = value !== undefined;

    return (
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <View style={styles.statCardHeader}>
                <View style={styles.statHeader}>
                    <Ionicons name={icon} size={13} color={theme.textMuted} />
                    <JempText type="caption" color={theme.textMuted} style={styles.statLabel}>
                        {label}
                    </JempText>
                </View>
                {trend !== null && <TrendBadge trend={trend} />}
            </View>
            <JempText type="h1" color={hasValue ? theme.textHeadline : theme.textMuted} style={styles.statValue}>
                {hasValue ? String(value) : '—'}
            </JempText>
            <View style={[styles.progressTrack, { backgroundColor: theme.borderDivider }]}>
                {hasValue && (
                    <LinearGradient
                        colors={[Cyan[500], Electric[500]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressFill, { width: `${value}%` }]}
                    />
                )}
            </View>
        </View>
    );
}

// ─── Overall card ────────────────────────────────────────────────────────────

function OverallCard({ value, trend }: { value: number; trend: number | null }) {
    return (
        <LinearGradient
            colors={[Cyan[500], Electric[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.overallCard}
        >
            <View style={styles.overallLeft}>
                <JempText type="caption" color="rgba(255,255,255,0.7)" style={styles.statLabel}>
                    Overall
                </JempText>
                <View style={styles.overallValueRow}>
                    <JempText type="h1" color="#fff" style={styles.statValue}>
                        {String(value)}
                    </JempText>
                    {trend !== null && <TrendBadge trend={trend} light />}
                </View>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.25)', flex: 1 }]}>
                <View style={[styles.progressFill, { width: `${value}%`, backgroundColor: 'rgba(255,255,255,0.6)' }]} />
            </View>
        </LinearGradient>
    );
}

// ─── Assessment row ──────────────────────────────────────────────────────────

interface AssessmentRowProps {
    entry: CategoryAssessmentEntry;
    categorySlug: string;
}

function AssessmentRow({ entry, categorySlug }: AssessmentRowProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const cat = getCategoryMeta(categorySlug);

    const changeColor =
        entry.percentChange === null ? theme.textMuted
            : entry.percentChange > 0 ? Cyan[400]
                : entry.percentChange < 0 ? '#ef4444'
                    : theme.textMuted;

    const changeLabel =
        entry.percentChange === null ? null
            : entry.percentChange > 0 ? `+${entry.percentChange}%`
                : entry.percentChange < 0 ? `${entry.percentChange}%`
                    : '0%';

    return (
        <View style={[styles.assessRow, { backgroundColor: theme.surface }]}>
            <View style={styles.assessLeft}>
                <JempText type="body-l" color={theme.text} numberOfLines={1} style={styles.assessName}>
                    {entry.name}
                </JempText>
                {/* Start → End values, or just latest if only one entry */}
                <JempText type="caption" color={theme.textMuted}>
                    {entry.firstValue !== null
                        ? `${entry.firstValue} → ${entry.latestValue} ${entry.unit}`
                        : `${entry.latestValue} ${entry.unit}`}
                </JempText>
            </View>
            <View style={styles.assessRight}>
                {entry.latestScore !== null && (
                    <View style={[styles.scorePill, { backgroundColor: `${cat.color}20` }]}>
                        <JempText type="caption" color={cat.color} style={styles.scoreText}>
                            {entry.latestScore}
                        </JempText>
                    </View>
                )}
                {changeLabel !== null && (
                    <JempText type="caption" color={changeColor} style={styles.deltaText}>
                        {changeLabel}
                    </JempText>
                )}
            </View>
        </View>
    );
}

// ─── Dropdown ────────────────────────────────────────────────────────────────

interface CategoryDropdownProps {
    selected: string;
    onSelect: (key: string) => void;
}

function CategoryDropdown({ selected, onSelect }: CategoryDropdownProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [open, setOpen] = useState(false);

    const selectedOpt = DROPDOWN_OPTIONS.find(o => o.key === selected)!;
    const selectedLabel = t(selectedOpt.labelKey);

    return (
        <>
            <Pressable
                onPress={() => setOpen(true)}
                style={[styles.dropdownBtn, { backgroundColor: theme.surface }]}
            >
                <JempText type="button" color={theme.text} style={styles.dropdownLabel} numberOfLines={1}>
                    {selectedLabel}
                </JempText>
                <Ionicons name="chevron-down" size={14} color={theme.textMuted} />
            </Pressable>

            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
                    <View
                        style={[styles.modalSheet, { backgroundColor: theme.surface, paddingBottom: insets.bottom + 8 }]}
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={[styles.modalHandle, { backgroundColor: theme.borderStrong }]} />
                        {DROPDOWN_OPTIONS.map(opt => {
                            const label = t(opt.labelKey);
                            const active = opt.key === selected;
                            return (
                                <Pressable
                                    key={opt.key}
                                    onPress={() => { onSelect(opt.key); setOpen(false); }}
                                    style={[styles.modalOption, active && { backgroundColor: theme.borderDivider }]}
                                >
                                    <JempText type="body-l" color={active ? theme.text : theme.textMuted}>
                                        {label}
                                    </JempText>
                                    {active && <Ionicons name="checkmark" size={18} color={Cyan[500]} />}
                                </Pressable>
                            );
                        })}
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

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
    console.log('[progress] selectedCategory:', selectedCategory, '| chartData.length:', chartData.length, '| historyData keys:', Object.keys(historyData ?? {}));

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
                            <JempText type="h2">{t('ui.progress_category_stats')}</JempText>
                            {overallScore !== null && selectedCategory === 'all' && (
                                <OverallCard value={overallScore} trend={overallTrend} />
                            )}
                            <View style={styles.statsGrid}>
                                {visibleStats.map(slug => (
                                    <StatCard
                                        key={slug}
                                        slug={slug}
                                        value={categoryLevels?.[slug]}
                                        trend={categoryTrends[slug] ?? null}
                                    />
                                ))}
                            </View>
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },
    headerSection: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
    title: { letterSpacing: -0.5, marginBottom: 12 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: 20, paddingBottom: 32, gap: 20 },

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

    overallCard: {
        borderRadius: 16,
        padding: 14,
        paddingBottom: 0,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 16,
        overflow: 'hidden',
    },
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
