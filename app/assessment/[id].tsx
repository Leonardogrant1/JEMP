import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCompleteAssessment } from '@/mutations/use-complete-assessment';
import { useCurrentUser } from '@/providers/current-user-provider';
import { supabase } from '@/services/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

function useUserAssessmentQuery(userAssessmentId: string | undefined) {
    return useQuery({
        queryKey: ['user-assessment', userAssessmentId],
        queryFn: async () => {
            const { data } = await supabase
                .from('user_assessments')
                .select(`
                    id, status,
                    assessment:assessments (
                        id, slug, name, description,
                        measured_metric_id,
                        category_id,
                        metric:metrics!measured_metric_id ( id, slug, unit, higher_is_better ),
                        category:categories ( slug ),
                        assessment_equipments ( equipment:equipments ( slug ) )
                    )
                `)
                .eq('id', userAssessmentId!)
                .single();

            if (!data) return null;

            const assessment = data.assessment as any;
            return {
                id: data.id,
                status: data.status,
                assessment: {
                    ...assessment,
                    equipments: (assessment.assessment_equipments ?? [])
                        .map((ae: any) => ae.equipment?.slug)
                        .filter(Boolean) as string[],
                },
            };
        },
        enabled: !!userAssessmentId,
    });
}

const UNIT_LABELS: Record<string, { en: string; de: string }> = {
    kg: { en: 'kg', de: 'kg' },
    count: { en: 'reps', de: 'Wdh.' },
    s: { en: 'seconds', de: 'Sekunden' },
    cm: { en: 'cm', de: 'cm' },
    m: { en: 'm', de: 'm' },
};

export default function AssessmentScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile } = useCurrentUser();

    const { data, isLoading } = useUserAssessmentQuery(id);
    const completeAssessment = useCompleteAssessment();
    const [value, setValue] = useState('');

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
                <View style={styles.centered}>
                    <ActivityIndicator color={theme.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!data) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
                <View style={styles.centered}>
                    <JempText type="body-l" color={theme.textMuted}>Assessment not found</JempText>
                </View>
            </SafeAreaView>
        );
    }

    const { assessment } = data;
    const metric = assessment.metric;
    const unitKey = metric?.unit ?? 'count';
    const unitLabel = UNIT_LABELS[unitKey]?.en ?? unitKey;

    const handleSubmit = () => {
        if (!value.trim() || !profile?.id || !metric?.id) return;
        if (!profile.birth_date || !profile.weight_in_kg || !profile.height_in_cm || !profile.gender) return;

        const numericValue = parseFloat(value);
        if (isNaN(numericValue) || numericValue <= 0) return;

        completeAssessment.mutate({
            userAssessmentId: data.id,
            assessmentId: assessment.id,
            userId: profile.id,
            metricId: metric.id,
            value: numericValue,
            assessmentSlug: assessment.slug,
            categoryId: assessment.category_id,
            userProfile: {
                gender: profile.gender as 'male' | 'female',
                weight_kg: profile.weight_in_kg,
                height_cm: profile.height_in_cm,
                birth_date: profile.birth_date,
            },
        }, {
            onSuccess: () => router.back(),
        });
    };

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} hitSlop={12}>
                        <Ionicons name="chevron-back" size={24} color={theme.text} />
                    </Pressable>
                    <JempText type="caption" color={Cyan[500]}>
                        {t('tab.assessments').toUpperCase()}
                    </JempText>
                    <View style={{ width: 24 }} />
                </View>

                {/* Title */}
                <View style={styles.titleSection}>
                    {assessment.category && (
                        <JempText type="caption" color={Cyan[500]} style={styles.catLabel}>
                            {t(`category.${assessment.category.slug}`).toUpperCase()}
                        </JempText>
                    )}
                    <JempText type="hero">{assessment.name}</JempText>
                </View>

                {/* Description */}
                {assessment.description && (
                    <View style={[styles.descCard, { backgroundColor: theme.surface }]}>
                        <Ionicons name="information-circle-outline" size={18} color={Cyan[500]} />
                        <JempText type="body-sm" color={theme.textMuted} style={styles.descText}>
                            {assessment.description}
                        </JempText>
                    </View>
                )}

                {/* Equipment */}
                {assessment.equipments.length > 0 && (
                    <View style={styles.equipSection}>
                        <JempText type="caption" color={theme.textMuted}>
                            {t('ui.equipment').toUpperCase()}
                        </JempText>
                        <View style={styles.equipRow}>
                            {assessment.equipments.map((slug: string) => (
                                <View key={slug} style={[styles.equipChip, { backgroundColor: theme.surface }]}>
                                    <Ionicons name="barbell-outline" size={12} color={Cyan[500]} />
                                    <JempText type="caption" color={theme.text}>
                                        {t(`equipment.${slug}`)}
                                    </JempText>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Input */}
                <View style={styles.inputSection}>
                    <JempText type="h2">{t('ui.enter_result')}</JempText>
                    <JempText type="caption" color={theme.textMuted}>
                        {unitLabel.toUpperCase()}
                    </JempText>
                    <View style={[styles.pillInput, { backgroundColor: theme.surface }]}>
                        <TextInput
                            style={[styles.pillTextInput, { color: theme.text }]}
                            value={value}
                            onChangeText={setValue}
                            keyboardType="decimal-pad"
                            placeholder="–"
                            placeholderTextColor={theme.textPlaceholder}
                            autoFocus
                        />
                    </View>
                </View>
            </ScrollView>

            {/* CTA */}
            <View style={[styles.bottomBar, { backgroundColor: theme.background }]}>
                <Pressable
                    style={styles.submitBtn}
                    onPress={handleSubmit}
                    disabled={!value.trim() || completeAssessment.isPending}
                >
                    <LinearGradient
                        colors={value.trim() ? [Cyan[500], Electric[500]] : [`${Cyan[500]}40`, `${Electric[500]}40`]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.submitBtnGradient}
                    >
                        {completeAssessment.isPending ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <JempText type="button" color="#fff">{t('ui.save_result')}</JempText>
                        )}
                    </LinearGradient>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120, gap: 20 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },

    titleSection: { gap: 6 },
    catLabel: { letterSpacing: 1.5 },

    descCard: {
        flexDirection: 'row',
        borderRadius: 14,
        padding: 14,
        gap: 10,
        alignItems: 'flex-start',
    },
    descText: { flex: 1 },

    equipSection: { gap: 8 },
    equipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    equipChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
    },

    inputSection: { alignItems: 'center', gap: 8, paddingTop: 12 },
    pillInput: {
        borderRadius: 16,
        width: '100%',
        height: 72,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pillTextInput: {
        fontSize: 32,
        fontWeight: '700',
        textAlign: 'center',
        width: '100%',
        height: '100%',
    },

    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 34,
        paddingTop: 12,
    },
    submitBtn: { borderRadius: 100, overflow: 'hidden' },
    submitBtnGradient: {
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
