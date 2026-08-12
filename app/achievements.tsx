import { JempText } from '@/components/jemp-text';
import { AchievementDef, laddersForGender } from '@/constants/achievements';
import { Colors } from '@/constants/theme';
import { nextTier, tierForScore } from '@/constants/tiers';
import { displayMetricValue, UnitSystem } from '@/helpers/units';
import { useAchievementsBackfill } from '@/hooks/use-achievements-backfill';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOverallScore } from '@/hooks/use-overall-score';
import { meetsThreshold } from '@/lib/achievements';
import { useCurrentUser } from '@/providers/current-user-provider';
import { useAssessmentBestValuesQuery } from '@/queries/use-assessment-best-values-query';
import { useUserAchievementsQuery } from '@/queries/use-user-achievements-query';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORY_ORDER = ['strength', 'jumps', 'upper_body_plyometrics', 'lower_body_plyometrics'] as const;

function formatThreshold(def: AchievementDef, unitSystem: UnitSystem): string {
    const { value, unit } = displayMetricValue(def.threshold, def.unit === 'count' ? 'count' : def.unit, unitSystem);
    const prefix = def.assessmentSlug === 'weighted_pullups_1rm' ? '+' : '';
    if (def.unit === 'count') return `${prefix}${value}×`;
    if (def.unit === 's') return `${prefix}${value}s`;
    return `${prefix}${value} ${unit}`;
}

export default function AchievementsScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile } = useCurrentUser();

    useAchievementsBackfill();
    const overallScore = useOverallScore(profile?.id);
    const achievementsQuery = useUserAchievementsQuery(profile?.id);
    const bestValuesQuery = useAssessmentBestValuesQuery(profile?.id);

    const unitSystem: UnitSystem = profile?.unit_system === 'imperial' ? 'imperial' : 'metric';
    const gender = profile?.gender === 'female' ? 'female' as const : 'male' as const;

    const unlockedBySlug = useMemo(() => {
        const map = new Map<string, { unlocked_at: string; value: number | null }>();
        for (const row of achievementsQuery.data ?? []) {
            map.set(row.achievement_slug, { unlocked_at: row.unlocked_at, value: row.value });
        }
        return map;
    }, [achievementsQuery.data]);

    const ladders = useMemo(() => laddersForGender(gender), [gender]);
    const totalCount = useMemo(() => ladders.reduce((sum, l) => sum + l.defs.length, 0), [ladders]);
    const unlockedCount = useMemo(
        () => ladders.reduce((sum, l) => sum + l.defs.filter(d => unlockedBySlug.has(d.slug)).length, 0),
        [ladders, unlockedBySlug],
    );

    const tier = overallScore !== null ? tierForScore(overallScore) : null;
    const upcoming = overallScore !== null ? nextTier(overallScore) : null;

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} hitSlop={12}>
                    <Ionicons name="arrow-back" size={26} color={theme.text} />
                </Pressable>
                <JempText type="h1" style={styles.headerTitle}>{t('achievements.screen_title')}</JempText>
                <View style={{ width: 26 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* ── Title hero ── */}
                <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: tier?.color ?? theme.borderStrong }]}>
                    <Ionicons name="trophy" size={28} color={tier?.color ?? theme.textMuted} />
                    <JempText type="h1" color={tier?.color ?? theme.textMuted} style={styles.heroTier}>
                        {tier ? t(tier.i18nKey).toUpperCase() : '—'}
                    </JempText>
                    {overallScore !== null ? (
                        <JempText type="body-sm" color={theme.textMuted}>
                            {upcoming
                                ? t('achievements.points_to_next', { points: upcoming.min - overallScore, tier: t(upcoming.i18nKey) })
                                : t('achievements.top_tier_reached')}
                        </JempText>
                    ) : (
                        <JempText type="body-sm" color={theme.textMuted}>{t('achievements.empty_hint')}</JempText>
                    )}
                    <JempText type="caption" color={theme.textSubtle}>
                        {t('achievements.unlocked_count', { count: unlockedCount, total: totalCount })}
                    </JempText>
                </View>

                {/* ── Ladders by category ── */}
                {CATEGORY_ORDER.map(cat => {
                    const catLadders = ladders.filter(l => l.category === cat);
                    if (!catLadders.length) return null;
                    return (
                        <View key={cat} style={styles.section}>
                            <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                                {t(`achievements.category_${cat}`).toUpperCase()}
                            </JempText>
                            {catLadders.map(ladder => {
                                const best = bestValuesQuery.data?.[ladder.assessmentSlug];
                                const bestValue = best
                                    ? (ladder.defs[0].direction === 'gte' ? best.max : best.min)
                                    : null;
                                const next = ladder.defs.find(d => !unlockedBySlug.has(d.slug));
                                const gap = next && bestValue !== null && !meetsThreshold(next, bestValue)
                                    ? Math.abs(next.direction === 'gte' ? next.threshold - bestValue : bestValue - next.threshold)
                                    : null;
                                return (
                                    <View key={ladder.assessmentSlug} style={[styles.ladderCard, { backgroundColor: theme.surface }]}>
                                        <JempText type="body-l" style={styles.ladderTitle}>
                                            {t(`achievements.exercise.${ladder.assessmentSlug}`)}
                                        </JempText>
                                        <View style={styles.rungRow}>
                                            {ladder.defs.map(def => {
                                                const unlock = unlockedBySlug.get(def.slug);
                                                return (
                                                    <View
                                                        key={def.slug}
                                                        style={[
                                                            styles.rung,
                                                            unlock
                                                                ? { borderColor: '#FFD700', backgroundColor: 'rgba(255, 215, 0, 0.12)' }
                                                                : { borderColor: theme.borderStrong },
                                                        ]}
                                                    >
                                                        <Ionicons
                                                            name={unlock ? 'trophy' : 'lock-closed-outline'}
                                                            size={12}
                                                            color={unlock ? '#FFD700' : theme.textSubtle}
                                                        />
                                                        <JempText type="caption" color={unlock ? theme.text : theme.textSubtle}>
                                                            {formatThreshold(def, unitSystem)}
                                                        </JempText>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                        {gap !== null && next && (
                                            <JempText type="caption" color={theme.textMuted} style={styles.nextUp}>
                                                {t('achievements.next_up', {
                                                    amount: formatThreshold({ ...next, threshold: Math.round(gap * 100) / 100 }, unitSystem),
                                                })}
                                            </JempText>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    headerTitle: { fontSize: 22 },
    content: { paddingHorizontal: 20, paddingBottom: 40, gap: 24 },
    heroCard: {
        alignItems: 'center',
        gap: 6,
        borderWidth: 1.5,
        borderRadius: 20,
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    heroTier: { letterSpacing: 2 },
    section: { gap: 10 },
    sectionLabel: { letterSpacing: 1 },
    ladderCard: { borderRadius: 16, padding: 14, gap: 10 },
    ladderTitle: { fontWeight: '600' },
    rungRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    rung: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderRadius: 100,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    nextUp: { fontStyle: 'italic' },
});
