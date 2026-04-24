import { JempText } from '@/components/jemp-text';
import { getCategoryMeta } from '@/constants/categories';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { useUserAssessmentsQuery } from '@/queries/use-user-assessments-query';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

// ── Icons ────────────────────────────────────────────────────────────────

function GradientClipboardIcon({ size = 42 }: { size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 512 512">
            <Defs>
                <SvgLinearGradient id="clip-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0" stopColor={Cyan[500]} />
                    <Stop offset="1" stopColor={Electric[500]} />
                </SvgLinearGradient>
            </Defs>
            <Path
                d="M336 64h32a48 48 0 0148 48v320a48 48 0 01-48 48H144a48 48 0 01-48-48V112a48 48 0 0148-48h32"
                fill="none" stroke="url(#clip-grad)" strokeWidth="32" strokeLinejoin="round"
            />
            <Path
                d="M336 96H176a16 16 0 01-16-16v-16a64 64 0 01128 0v16a16 16 0 01-16 16z"
                fill="url(#clip-grad)"
            />
        </Svg>
    );
}

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    strength: 'barbell',
    jumps: 'trending-up',
    lower_body_plyometrics: 'flash',
    upper_body_plyometrics: 'fitness',
    mobility: 'body',
};

// ── Screen ───────────────────────────────────────────────────────────────

export default function AssessmentsScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile } = useCurrentUser();

    const { data: userAssessments, isLoading } = useUserAssessmentsQuery(profile?.id);

    const pending = useMemo(
        () => (userAssessments ?? []).filter(ua => ua.status === 'pending' || ua.status === 'in_progress'),
        [userAssessments],
    );
    const completed = useMemo(
        () => (userAssessments ?? []).filter(ua => ua.status === 'completed'),
        [userAssessments],
    );

    const groupByCategory = (items: typeof pending) => {
        const map = new Map<string, typeof pending>();
        for (const ua of items) {
            const slug = ua.assessment.category?.slug ?? 'other';
            if (!map.has(slug)) map.set(slug, []);
            map.get(slug)!.push(ua);
        }
        return map;
    };

    const hasAssessments = pending.length > 0 || completed.length > 0;

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={styles.headerSection}>
                <JempText type="h1" style={styles.title}>{t('tab.assessments')}</JempText>
                <JempText type="body-sm" color={theme.textMuted}>
                    {t('ui.assessments_subtitle')}
                </JempText>
            </View>

            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={theme.primary} />
                </View>
            ) : !hasAssessments ? (
                <View style={styles.emptyWrap}>
                    <GradientClipboardIcon size={42} />
                    <JempText type="body-l" style={styles.emptyText} color={theme.textMuted}>
                        {t('ui.no_assessments')}
                    </JempText>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    {/* Pending */}
                    {pending.length > 0 && (
                        <View style={styles.section}>
                            <JempText type="button" gradient>
                                {t('ui.pending_assessments').toUpperCase()}
                            </JempText>

                            {[...groupByCategory(pending)].map(([catSlug, items]) => {
                                const icon = CATEGORY_ICONS[catSlug] ?? 'clipboard';
                                const cat = getCategoryMeta(catSlug);

                                return (
                                    <View key={catSlug} style={styles.categoryGroup}>
                                        {/* Category header */}
                                        <View style={styles.categoryHeader}>
                                            <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                                            <JempText type="caption" color={cat.color} style={styles.categoryLabel}>
                                                {t(`category.${catSlug}`, { defaultValue: catSlug }).toUpperCase()}
                                            </JempText>
                                        </View>

                                        {items.map(ua => (
                                            <Pressable
                                                key={ua.id}
                                                style={[styles.card, { backgroundColor: theme.surface }]}
                                                onPress={() => router.push(`/assessment/${ua.id}`)}
                                            >
                                                <View style={styles.cardRow}>
                                                    <View style={[styles.iconBox, { backgroundColor: theme.background }]}>
                                                        <Ionicons name={icon} size={22} color={cat.color} />
                                                    </View>
                                                    <View style={styles.cardContent}>
                                                        <JempText type="body-l" color={theme.text}>
                                                            {ua.assessment.name}
                                                        </JempText>
                                                        {ua.assessment.description && (
                                                            <JempText type="caption" color={theme.textMuted} numberOfLines={2}>
                                                                {ua.assessment.description}
                                                            </JempText>
                                                        )}
                                                    </View>
                                                    <View style={[styles.playBox, { backgroundColor: theme.background }]}>
                                                        <Ionicons name="play" size={18} color={cat.color} />
                                                    </View>
                                                </View>
                                            </Pressable>
                                        ))}
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Completed */}
                    {completed.length > 0 && (
                        <View style={styles.section}>
                            <JempText type="button" color={theme.textMuted}>
                                {t('ui.completed_assessments').toUpperCase()}
                            </JempText>

                            {[...groupByCategory(completed)].map(([catSlug, items]) => {
                                const icon = CATEGORY_ICONS[catSlug] ?? 'clipboard';

                                return (
                                    <View key={catSlug} style={styles.categoryGroup}>
                                        {/* Category header */}
                                        <View style={styles.categoryHeader}>
                                            <View style={[styles.categoryDot, { backgroundColor: theme.textSubtle }]} />
                                            <JempText type="caption" color={theme.textSubtle} style={styles.categoryLabel}>
                                                {t(`category.${catSlug}`, { defaultValue: catSlug }).toUpperCase()}
                                            </JempText>
                                        </View>

                                        {items.map(ua => (
                                            <View
                                                key={ua.id}
                                                style={[styles.card, styles.cardCompleted, { backgroundColor: theme.surface }]}
                                            >
                                                <View style={styles.cardRow}>
                                                    <View style={[styles.iconBox, { backgroundColor: theme.background }]}>
                                                        <Ionicons name={icon} size={22} color={theme.textMuted} />
                                                    </View>
                                                    <View style={styles.cardContent}>
                                                        <JempText type="body-l" color={theme.text}>
                                                            {ua.assessment.name}
                                                        </JempText>
                                                        {ua.completed_at && (
                                                            <JempText type="caption" color={theme.textSubtle}>
                                                                {new Date(ua.completed_at).toLocaleDateString()}
                                                            </JempText>
                                                        )}
                                                    </View>
                                                    <Ionicons name="checkmark-circle" size={22} color={Cyan[500]} />
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },
    headerSection: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 4 },
    scroll: { paddingHorizontal: 20, paddingBottom: 32, gap: 20 },
    title: { letterSpacing: -0.5 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    emptyText: { textAlign: 'center', width: '80%' },

    section: { gap: 16 },
    categoryGroup: { gap: 10 },
    categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 },
    categoryDot: { width: 6, height: 6, borderRadius: 3 },
    categoryLabel: { letterSpacing: 1.2, fontSize: 11 },

    // Card
    card: {
        borderRadius: 18,
        padding: 16,
        gap: 12,
    },
    cardCompleted: { opacity: 0.7 },
    catBadgeWrap: { alignItems: 'center' },
    catBadge: {
        paddingHorizontal: 12,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
    },
    catBadgeText: { letterSpacing: 1.2, fontSize: 10 },

    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        flex: 1,
        gap: 3,
    },
    playBox: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
