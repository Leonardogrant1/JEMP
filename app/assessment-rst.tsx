import { JempText } from '@/components/jemp-text';
import { Colors, GRADIENT, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { rstDerive, RST_RUN_COUNT } from '@/lib/rst';
import { useCompleteAssessment } from '@/mutations/use-complete-assessment';
import { useCurrentUser } from '@/providers/current-user-provider';
import { useUserAssessmentQuery } from '@/queries/use-user-assessment-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** RST-Flow (Spec §4.4/§5.5): 6 Zeiten → Drop-off + Durchschnitt → Conditioning-
 *  Score; Lauf 1 füttert den Sprint-Score (Prioritäts-Regel in der Mutation). */
export default function AssessmentRstScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile } = useCurrentUser();

    const { data, isLoading } = useUserAssessmentQuery(id);
    const completeAssessment = useCompleteAssessment();
    const [times, setTimes] = useState<string[]>(Array(RST_RUN_COUNT).fill(''));

    const parsed = times.map((v) => parseFloat(v.replace(',', '.')));
    const derived = rstDerive(parsed);
    const canSubmit = derived !== null && !completeAssessment.isPending;

    function setTime(i: number, v: string) {
        const next = [...times];
        next[i] = v.replace(/[^0-9.,]/g, '');
        setTimes(next);
    }

    function handleSubmit() {
        if (!derived || !profile?.id || !data?.assessment) return;
        const metricId = data.assessment.measured_metric_id;
        if (!metricId || !data.assessment.category_id) return;
        completeAssessment.mutate({
            userAssessmentId: data.id,
            assessmentId: data.assessment.id,
            userId: profile.id,
            metricId,
            value: derived.dropOffPct,
            assessmentSlug: 'repeated_sprint_test',
            categoryId: data.assessment.category_id,
            rstTimes: parsed,
            userProfile: {
                gender: profile.gender as 'male' | 'female',
                weight_kg: profile.weight_in_kg!,
                height_cm: profile.height_in_cm!,
                birth_date: profile.birth_date!,
            },
        }, { onSuccess: () => router.back() });
    }

    if (isLoading || !data) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
                <ActivityIndicator style={{ marginTop: 80 }} />
            </SafeAreaView>
        );
    }

    const description = (data.assessment?.description_i18n as Record<string, string> | null)?.[i18n.language]
        ?? data.assessment?.description;

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={theme.text} />
                </Pressable>
                <JempText type="h1" style={styles.title}>{t('rst.title')}</JempText>
                <JempText type="body-sm" color={theme.textMuted} style={styles.subtitle}>
                    {description ?? t('rst.subtitle')}
                </JempText>

                <View style={styles.grid}>
                    {times.map((v, i) => (
                        <View key={i} style={styles.cell}>
                            <JempText type="caption" color={theme.textMuted}>{t('rst.run_label', { n: i + 1 })}</JempText>
                            <TextInput
                                value={v}
                                onChangeText={(text) => setTime(i, text)}
                                keyboardType="decimal-pad"
                                placeholder="4.5"
                                placeholderTextColor={theme.textSubtle}
                                style={[styles.input, { color: theme.text, borderColor: v ? GradientMid : theme.borderStrong }]}
                            />
                        </View>
                    ))}
                </View>

                {derived && (
                    <JempText type="body-sm" color={GradientMid} style={styles.derived}>
                        {`Drop-off ${derived.dropOffPct}% · Ø ${derived.meanTime}s`}
                    </JempText>
                )}

                <Pressable onPress={handleSubmit} disabled={!canSubmit} style={[styles.submitWrap, { opacity: canSubmit ? 1 : 0.4 }]}>
                    <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submit}>
                        {completeAssessment.isPending
                            ? <ActivityIndicator color="#fff" />
                            : <JempText type="button" color="#fff">{t('rst.submit')}</JempText>}
                    </LinearGradient>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    content: { paddingHorizontal: 24, paddingBottom: 40 },
    backBtn: { marginTop: 8, marginBottom: 12, alignSelf: 'flex-start' },
    title: { marginBottom: 8 },
    subtitle: { marginBottom: 20, lineHeight: 19 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    cell: { width: '30%', gap: 4 },
    input: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, fontSize: 20, textAlign: 'center' },
    derived: { marginTop: 16, textAlign: 'center' },
    submitWrap: { marginTop: 24 },
    submit: { height: 52, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
});
