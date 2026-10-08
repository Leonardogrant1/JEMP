import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CATEGORY_SVG_ICONS } from '@/constants/category-icons';
import { getCategoryLabel, getCategoryDescription, type CategoryI18n } from '@/constants/category-labels';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
    budgetSpent, canIncrement, initialLevels, normalizeToBudget,
    pillarBudget, visiblePillars, type PillarLevel, type PillarPreset,
} from '@/lib/pillar-budget';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { supabase } from '@/services/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

type PillarItem = PillarPreset & { label: string; description_i18n: CategoryI18n | null };

export function PillarStepperStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const sportId = useOnboardingStore((s) => s.sport_id);
    const storedLevels = useOnboardingStore((s) => s.pillarLevels);
    const setStore = useOnboardingStore((s) => s.set);
    const [pillars, setPillars] = useState<PillarItem[]>([]);
    const [levels, setLevels] = useState<PillarLevel[]>(storedLevels);
    const [infoPillar, setInfoPillar] = useState<PillarItem | null>(null);
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const budget = pillarBudget(pillars.length);
    const spent = budgetSpent(levels);

    useEffect(() => {
        // Preset ist ein valider Default — Weiter geht immer (Spec §3.1).
        setCanContinue(true);
        if (!sportId) return;
        (async () => {
            const [{ data: presetRows }, { data: { session } }] = await Promise.all([
                supabase
                    .from('sport_category_relevance')
                    .select('relevance, categories!inner(id, slug, name_i18n, description_i18n, is_active)')
                    .eq('sport_id', sportId)
                    .eq('categories.is_active', true),
                supabase.auth.getSession(),
            ]);
            if (!presetRows) return;
            const presets: PillarItem[] = presetRows.map((r: any) => ({
                categoryId: r.categories.id,
                slug: r.categories.slug,
                level: r.relevance,
                label: getCategoryLabel(r.categories.slug, t, r.categories.name_i18n as CategoryI18n),
                description_i18n: r.categories.description_i18n as CategoryI18n | null,
            }));
            const visible = visiblePillars(presets) as PillarItem[];
            setPillars(visible);

            // Prefill: Store (Back-Navigation) > übersetzte DB-Zeilen > Preset.
            let stored: PillarLevel[] | null = storedLevels.length > 0 ? storedLevels : null;
            if (!stored && session?.user) {
                const { data: dbRows } = await supabase
                    .from('user_pillar_levels')
                    .select('level, categories(id, slug)')
                    .eq('user_id', session.user.id);
                if (dbRows && dbRows.length > 0) {
                    stored = dbRows.map((r: any) => ({
                        categoryId: r.categories.id, slug: r.categories.slug, level: r.level,
                    }));
                }
            }
            const initial = normalizeToBudget(initialLevels(visible, stored), pillarBudget(visible.length));
            setLevels(initial);
            setStore({ pillarLevels: initial });
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sportId]);

    function applyLevels(next: PillarLevel[]) {
        setLevels(next);
        setStore({ pillarLevels: next });
    }

    function increment(categoryId: string) {
        if (!canIncrement(levels, categoryId, budget)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        applyLevels(levels.map((l) => l.categoryId === categoryId ? { ...l, level: (l.level + 1) as 1 | 2 | 3 } : l));
    }

    function decrement(categoryId: string) {
        const current = levels.find((l) => l.categoryId === categoryId);
        if (!current || current.level <= 1) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        applyLevels(levels.map((l) => l.categoryId === categoryId ? { ...l, level: (l.level - 1) as 1 | 2 | 3 } : l));
    }

    const sprintLevel = levels.find((l) => l.slug === 'sprints')?.level ?? 0;
    const codLevel = levels.find((l) => l.slug === 'cod')?.level ?? 0;
    const speedLevel = Math.max(sprintLevel, codLevel);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('pillars.title')}</JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('pillars.subtitle')}
                </JempText>
            </Animated.View>

            <View style={[styles.budgetBar, { backgroundColor: theme.surface }]}>
                <JempText type="body-sm" color={spent >= budget ? GradientMid : theme.textMuted}>
                    {t('pillars.budget', { spent, budget })}
                </JempText>
            </View>

            <View style={styles.list}>
                {pillars.map((pillar, i) => {
                    const level = levels.find((l) => l.categoryId === pillar.categoryId)?.level ?? 1;
                    const Icon = CATEGORY_SVG_ICONS[pillar.slug];
                    const plusEnabled = canIncrement(levels, pillar.categoryId, budget);
                    return (
                        <Animated.View key={pillar.categoryId} entering={FadeInDown.delay(Math.min(320 + i * 90, 700)).duration(500).springify()}>
                            <View style={[styles.row, { backgroundColor: theme.surface }]}>
                                <View style={[styles.iconBox, { backgroundColor: level >= 2 ? `${GradientMid}18` : theme.background }]}>
                                    {Icon
                                        ? <Icon width={22} height={22} color={level >= 2 ? GradientMid : theme.textMuted} />
                                        : <Ionicons name="fitness-outline" size={22} color={level >= 2 ? GradientMid : theme.textMuted} />}
                                </View>
                                <View style={styles.labelCol}>
                                    <View style={styles.labelRow}>
                                        <JempText type="body-l" color={theme.text}>{pillar.label}</JempText>
                                        <Pressable onPress={() => setInfoPillar(pillar)} hitSlop={10}>
                                            <Ionicons name="information-circle-outline" size={15} color={theme.textSubtle} />
                                        </Pressable>
                                    </View>
                                    <JempText type="caption" color={level >= 2 ? GradientMid : theme.textSubtle}>
                                        {t(`pillars.level_${level}`)}
                                    </JempText>
                                </View>
                                <View style={styles.stepper}>
                                    <Pressable onPress={() => decrement(pillar.categoryId)} hitSlop={8}
                                        style={[styles.stepBtn, { borderColor: theme.borderStrong, opacity: level > 1 ? 1 : 0.35 }]}>
                                        <Ionicons name="remove" size={18} color={theme.text} />
                                    </Pressable>
                                    <View style={styles.pips}>
                                        {[1, 2, 3].map((p) => (
                                            <View key={p} style={[styles.pip, { backgroundColor: p <= level ? GradientMid : theme.borderStrong }]} />
                                        ))}
                                    </View>
                                    <Pressable onPress={() => increment(pillar.categoryId)} hitSlop={8}
                                        style={[styles.stepBtn, { borderColor: theme.borderStrong, opacity: plusEnabled ? 1 : 0.35 }]}>
                                        <Ionicons name="add" size={18} color={theme.text} />
                                    </Pressable>
                                </View>
                            </View>
                            {pillar.slug === 'sprints' && speedLevel >= 2 && (
                                <JempText type="caption" color={theme.textMuted} style={styles.hint}>
                                    {speedLevel === 3 ? t('pillars.hint_sprint_level3') : t('pillars.hint_sprint_level2')}
                                </JempText>
                            )}
                        </Animated.View>
                    );
                })}
            </View>

            <ConfirmDialog
                visible={infoPillar !== null}
                title={infoPillar?.label ?? ''}
                message={infoPillar ? getCategoryDescription(infoPillar.slug, t, infoPillar.description_i18n ?? undefined) : undefined}
                confirmLabel={t('ui.got_it')}
                showCancel={false}
                onConfirm={() => setInfoPillar(null)}
                onClose={() => setInfoPillar(null)}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: 28, paddingTop: 32, paddingBottom: 24 },
    title: { marginBottom: 10 },
    subtitle: { marginBottom: 20 },
    budgetBar: {
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginBottom: 16,
        alignItems: 'center',
    },
    list: { gap: 10 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 12,
    },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    labelCol: { flex: 1, gap: 2 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stepBtn: {
        width: 30, height: 30, borderRadius: 15, borderWidth: 1.5,
        alignItems: 'center', justifyContent: 'center',
    },
    pips: { flexDirection: 'row', gap: 3 },
    pip: { width: 8, height: 8, borderRadius: 4 },
    hint: { marginTop: 6, marginHorizontal: 4 },
});
