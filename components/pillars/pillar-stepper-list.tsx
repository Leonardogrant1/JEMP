import { JempText } from '@/components/jemp-text';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CATEGORY_SVG_ICONS } from '@/constants/category-icons';
import { getCategoryDescription, type CategoryI18n } from '@/constants/category-labels';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { budgetSpent, canIncrement, type PillarLevel } from '@/lib/pillar-budget';
import { useToastStore } from '@/stores/toast-store';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

export type PillarListItem = {
    categoryId: string;
    slug: string;
    label: string;
    description_i18n?: CategoryI18n | null;
};

type Props = {
    pillars: PillarListItem[];
    levels: PillarLevel[];
    budget: number;
    onChange: (next: PillarLevel[]) => void;
};

/** Geteilte Stepper-Liste (Onboarding + Wizard): Stufen 1–3 unter Budget N+4. */
export function PillarStepperList({ pillars, levels, budget, onChange }: Props) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const [infoPillar, setInfoPillar] = useState<PillarListItem | null>(null);

    // Reframing (QA 08.10.): Stufe 1 ist die kostenlose Basis — angezeigt
    // werden nur die Fokus-Punkte darüber (Budget N+4 → immer 4 Punkte).
    // Engine und gespeicherte Levels bleiben unverändert.
    const focusSpent = budgetSpent(levels) - levels.length;
    const focusBudget = budget - levels.length;

    function increment(categoryId: string) {
        if (!canIncrement(levels, categoryId, budget)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const current = levels.find((l) => l.categoryId === categoryId);
            // Nur wenn das Budget blockiert (nicht die Stufen-Obergrenze):
            // erklären, warum der Tap nichts tut.
            if (current && current.level < 3) {
                useToastStore.getState().show(t('pillars.budget_full'));
            }
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChange(levels.map((l) => l.categoryId === categoryId ? { ...l, level: (l.level + 1) as 1 | 2 | 3 } : l));
    }

    function decrement(categoryId: string) {
        const current = levels.find((l) => l.categoryId === categoryId);
        if (!current || current.level <= 1) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChange(levels.map((l) => l.categoryId === categoryId ? { ...l, level: (l.level - 1) as 1 | 2 | 3 } : l));
    }

    const sprintLevel = levels.find((l) => l.slug === 'sprints')?.level ?? 0;
    const codLevel = levels.find((l) => l.slug === 'cod')?.level ?? 0;
    const speedLevel = Math.max(sprintLevel, codLevel);

    return (
        <View>
            <View style={[styles.budgetBar, { backgroundColor: theme.surface }]}>
                <JempText type="body-sm" color={focusSpent >= focusBudget ? GradientMid : theme.textMuted}>
                    {t('pillars.budget', { spent: focusSpent, budget: focusBudget })}
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
                                    {/* Ganze Label-Zeile öffnet den Info-Dialog — das (i) allein war
                                        zu klein und kollidierte bei langen Labels mit dem −-Button. */}
                                    <Pressable onPress={() => setInfoPillar(pillar)} hitSlop={6} style={styles.labelRow}>
                                        <JempText type="body-l" color={theme.text} numberOfLines={1} style={styles.labelText}>
                                            {pillar.label}
                                        </JempText>
                                        <Ionicons name="information-circle-outline" size={15} color={theme.textSubtle} />
                                    </Pressable>
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
                                        {/* Ein Pip pro investiertem Fokus-Punkt (Stufe − Basis) */}
                                        {[1, 2].map((p) => (
                                            <View key={p} style={[styles.pip, { backgroundColor: p <= level - 1 ? GradientMid : theme.borderStrong }]} />
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
                            {/* Kraft-Level haben seit §3.3 eine Wirkung — ohne Hinweis wirkt der Regler leer */}
                            {pillar.slug === 'strength' && level >= 2 && (
                                <JempText type="caption" color={theme.textMuted} style={styles.hint}>
                                    {level === 3 ? t('pillars.hint_strength_level3') : t('pillars.hint_strength_level2')}
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
        </View>
    );
}

const styles = StyleSheet.create({
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
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
    labelText: { flexShrink: 1 },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stepBtn: {
        width: 30, height: 30, borderRadius: 15, borderWidth: 1.5,
        alignItems: 'center', justifyContent: 'center',
    },
    pips: { flexDirection: 'row', gap: 3 },
    pip: { width: 8, height: 8, borderRadius: 4 },
    hint: { marginTop: 6, marginHorizontal: 4 },
});
