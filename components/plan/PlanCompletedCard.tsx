import { Colors, Cyan, Electric, GradientMid } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCurrentUser } from "@/providers/current-user-provider";
import { usePlanExerciseProgressQuery } from "@/queries/use-plan-exercise-progress-query";
import { useUserCategoryHistoryQuery } from "@/queries/use-user-category-history-query";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { JempText } from "../jemp-text";

const MAX_EXERCISE_ROWS = 5;

interface PlanCompletedCardProps {
    planId: string;
    planName: string;
    planStartDate: string | null;
    onGenerate: () => void;
}

type Improvement = { slug: string; first: number; last: number; delta: number };

export function PlanCompletedCard({ planId, planName, planStartDate, onGenerate }: PlanCompletedCardProps) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const router = useRouter();

    const { profile } = useCurrentUser();
    const { data: history } = useUserCategoryHistoryQuery(profile?.id, planStartDate ?? '1970-01-01');
    const { data: exerciseProgress } = usePlanExerciseProgressQuery(planId);

    // Level change per category across the plan period: first vs. latest snapshot
    const improvements = useMemo<Improvement[]>(() => {
        if (!history) return [];
        const rows: Improvement[] = [];
        for (const [slug, points] of Object.entries(history)) {
            if (points.length < 2) continue;
            const first = points[0].score;
            const last = points[points.length - 1].score;
            rows.push({ slug, first, last, delta: last - first });
        }
        const overall = rows.find(r => r.slug === 'all');
        const categories = rows.filter(r => r.slug !== 'all').sort((a, b) => b.delta - a.delta);
        return overall ? [overall, ...categories] : categories;
    }, [history]);

    // Assessments recur only every few weeks — without a re-assessment the
    // category levels stay flat, so hide that section rather than show all ±0
    const hasLevelChange = improvements.some(r => r.delta !== 0);
    const [showAllExercises, setShowAllExercises] = useState(false);
    const allExercises = exerciseProgress ?? [];
    const topExercises = showAllExercises ? allExercises : allExercises.slice(0, MAX_EXERCISE_ROWS);
    const hiddenCount = allExercises.length - MAX_EXERCISE_ROWS;

    const formatValue = (value: number, metric: string, unit: string) =>
        metric === 'reps' ? `${value} ${t('ui.reps')}` : unit ? `${value} ${unit}` : `${value}`;

    return (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* ── Title ── */}
            <View style={styles.titleSection}>
                <Ionicons name="trophy" size={36} color={GradientMid} style={styles.titleIcon} />
                <JempText type="caption" color={GradientMid}>
                    {t('ui.plan_completed_title').toUpperCase()}
                </JempText>
                <JempText type="hero" style={styles.centeredText}>{planName}</JempText>
                <JempText type="body-sm" color={theme.textMuted} style={styles.centeredText}>
                    {t('ui.plan_completed_subtitle')}
                </JempText>
            </View>

            {/* ── Exercise improvements ── */}
            {topExercises.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <LinearGradient
                            colors={[Cyan[500], Electric[500]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={styles.sectionAccentBar}
                        />
                        <JempText type="button" gradient>
                            {t('ui.plan_completed_exercise_results').toUpperCase()}
                        </JempText>
                    </View>
                    <View style={[styles.resultsCard, { backgroundColor: theme.surface, borderColor: theme.borderCard }]}>
                        {topExercises.map(({ exerciseId, name, metric, unit, first, last, percent }, idx) => (
                            <View
                                key={exerciseId}
                                style={[styles.resultRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.borderDivider }]}
                            >
                                <View style={styles.resultNameWrap}>
                                    <JempText type="body-l" color={theme.text} numberOfLines={1}>
                                        {name}
                                    </JempText>
                                    <JempText type="caption" color={theme.textMuted}>
                                        {formatValue(first, metric, unit)} → {formatValue(last, metric, unit)}
                                    </JempText>
                                </View>
                                {(percent ?? last - first) > 0 ? (
                                    <JempText type="h2" gradient>
                                        {percent !== null ? `+${percent} %` : `+${last - first}`}
                                    </JempText>
                                ) : (
                                    <JempText type="h2" color={(percent ?? last - first) < 0 ? '#ef4444' : theme.textMuted}>
                                        {percent !== null ? `${percent} %` : `${last - first}`}
                                    </JempText>
                                )}
                            </View>
                        ))}
                        {hiddenCount > 0 && (
                            <Pressable
                                style={[styles.showAllRow, { borderTopColor: theme.borderDivider }]}
                                onPress={() => setShowAllExercises(v => !v)}
                            >
                                <JempText type="body-sm" color={GradientMid}>
                                    {showAllExercises
                                        ? t('ui.plan_completed_show_less')
                                        : t('ui.plan_completed_show_all', { count: allExercises.length })}
                                </JempText>
                                <Ionicons
                                    name={showAllExercises ? 'chevron-up' : 'chevron-down'}
                                    size={16}
                                    color={GradientMid}
                                />
                            </Pressable>
                        )}
                    </View>
                </View>
            )}

            {/* ── Category level changes; without a re-assessment nudge to do one ── */}
            <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                    <LinearGradient
                        colors={[Cyan[500], Electric[500]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.sectionAccentBar}
                    />
                    <JempText type="button" gradient>
                        {t('ui.plan_completed_results').toUpperCase()}
                    </JempText>
                </View>
                {improvements.length > 0 && hasLevelChange ? (
                    <View style={[styles.resultsCard, { backgroundColor: theme.surface, borderColor: theme.borderCard }]}>
                        {improvements.map(({ slug, first, last, delta }, idx) => (
                            <View
                                key={slug}
                                style={[styles.resultRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.borderDivider }]}
                            >
                                <View style={styles.resultNameWrap}>
                                    <JempText type="body-l" color={theme.text} numberOfLines={1}>
                                        {slug === 'all'
                                            ? t('ui.plan_completed_overall')
                                            : t(`category.${slug}_short` as any)}
                                    </JempText>
                                    <JempText type="caption" color={theme.textMuted}>
                                        {first} → {last}
                                    </JempText>
                                </View>
                                {delta > 0 ? (
                                    <JempText type="h2" gradient>+{delta}</JempText>
                                ) : (
                                    <JempText type="h2" color={delta < 0 ? '#ef4444' : theme.textMuted}>
                                        {delta === 0 ? '±0' : delta}
                                    </JempText>
                                )}
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={[styles.resultsCard, styles.hintCard, { backgroundColor: theme.surface, borderColor: theme.borderCard }]}>
                        <Ionicons name="analytics-outline" size={22} color={GradientMid} />
                        <JempText type="body-sm" color={theme.textMuted} style={styles.hintText}>
                            {t('ui.plan_completed_levels_hint')}
                        </JempText>
                        <Pressable
                            style={styles.hintCta}
                            onPress={() => router.navigate('/(tabs)/assessments')}
                        >
                            <JempText type="body-sm" color={GradientMid}>
                                {t('ui.plan_completed_levels_cta')}
                            </JempText>
                            <Ionicons name="chevron-forward" size={14} color={GradientMid} />
                        </Pressable>
                    </View>
                )}
            </View>

            {/* ── CTA ── */}
            <TouchableOpacity style={styles.generateBtn} onPress={onGenerate}>
                <LinearGradient
                    colors={[Cyan[500], Electric[500]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.generateBtnGradient}
                >
                    <JempText type="button" color="#fff">{t('ui.plan_completed_generate')}</JempText>
                </LinearGradient>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: { gap: 20, paddingBottom: 24, flexGrow: 1, justifyContent: 'center' },

    titleSection: { alignItems: 'center', gap: 6 },
    titleIcon: { marginBottom: 4 },
    centeredText: { textAlign: 'center' },

    section: { gap: 8 },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionAccentBar: { width: 3, height: 24, borderRadius: 2 },

    resultsCard: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16 },
    resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    resultNameWrap: { flex: 1, gap: 2 },
    showAllRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 12, borderTopWidth: 1,
    },
    hintCard: { alignItems: 'center', gap: 8, paddingVertical: 20, paddingHorizontal: 20 },
    hintText: { textAlign: 'center', lineHeight: 20 },
    hintCta: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 },

    generateBtn: { borderRadius: 100, overflow: 'hidden' },
    generateBtnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
});
