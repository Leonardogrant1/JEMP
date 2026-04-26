import { GradientClipboardIcon } from '@/components/gradient-clipboard';
import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { useUserAssessmentsQuery } from '@/queries/use-user-assessments-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AssessmentsScreen() {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile } = useCurrentUser();

    const { data: userAssessments, isLoading } = useUserAssessmentsQuery(profile?.id);

    const pending = userAssessments ?? [];

    const groupByCategory = (items: typeof pending) => {
        const map = new Map<string, typeof pending>();
        for (const ua of items) {
            const slug = ua.assessment.category?.slug ?? 'other';
            if (!map.has(slug)) map.set(slug, []);
            map.get(slug)!.push(ua);
        }
        return map;
    };

    const hasAssessments = pending.length > 0;

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
                    <View style={styles.section}>
                        {[...groupByCategory(pending)].map(([catSlug, items]) => {
                            return (
                                <View key={catSlug} style={styles.categoryGroup}>
                                    <JempText type="h2" style={styles.categoryTitle}>
                                        {t(`category.${catSlug}`, { defaultValue: catSlug })}
                                    </JempText>

                                    {items.map(ua => (
                                        <Pressable
                                            key={ua.id}
                                            style={[styles.card, { backgroundColor: theme.surface }]}
                                            onPress={() => router.push(`/assessment/${ua.id}`)}
                                        >
                                            <LinearGradient
                                                colors={[Cyan[500], Electric[500]]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={styles.dot}
                                            />
                                            <JempText type="body-l" color={theme.textMuted} style={styles.assessmentName}>
                                                {(ua.assessment.name_i18n as Record<string, string> | null)?.[locale] ?? ua.assessment.name}
                                            </JempText>
                                            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                                        </Pressable>
                                    ))}
                                </View>
                            );
                        })}
                    </View>
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

    section: { gap: 28, paddingTop: 40 },
    categoryGroup: { gap: 8 },
    categoryTitle: { letterSpacing: -0.3 },

    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    assessmentName: { flex: 1 },
});
