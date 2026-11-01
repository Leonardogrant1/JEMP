import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { InjuryConflict, InjuryConstraint } from '@/lib/injury-constraints';
import { fetchActiveConstraints } from '@/lib/injury-constraints';
import { usePlan } from '@/providers/plan-provider';
import { useSuperwallFunctions } from '@/services/purchases/superwall/useSuperwall';
import { ensureInjuryGate } from '@/stores/injury-gate-store';
import { useToastStore } from '@/stores/toast-store';
import { devError } from '@/utils/dev-log';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import Reanimated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

const MODE_COLORS: Record<InjuryConstraint['mode'], string> = {
    block: '#ef4444',
    light_only: '#f59e0b',
};

// Pillars with a conflict-specific copy get it; everything else falls back
// to the generic text with the pillar label (category.<pillar>) interpolated —
// detectPriorityConflicts (worker Task 7) only ever emits a handful of slugs
// (sprints, strength, lower_body_plyometrics, upper_body_plyometrics), all of
// which already have a `category.<slug>` translation.
const PILLAR_SPECIFIC_CONFLICT_KEYS: Record<string, string> = {
    sprints: 'injuries.conflict_sprints',
};

/**
 * Detail-Sheet hinter dem InjuryAdjustedBadge (Task 8): zeigt (1) die
 * aktuell aktiven Constraints read-only, (2) die Arzt/Akut-Note (Task 6),
 * abgeleitet aus den aktiven Constraints — NICHT aus
 * `workout_plans.description`, das der Worker nur auf Deutsch schreibt,
 * (3) pro `injury_conflicts`-Eintrag einen Prio-Konflikt-Hinweis.
 *
 * `injury_conflicts` ist NULL, wenn der Plan keine Konflikte hat (Task 7
 * speichert bewusst kein leeres Array) — Review-blockierender Fehler wäre
 * ein bare `.map` auf dem Rohfeld, daher immer `?? []` vor dem Cast.
 */
export default function InjuryPlanInfoScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const router = useRouter();
    const { height: windowHeight } = useWindowDimensions();
    const { plan } = usePlan();
    const { openWithPlacement } = useSuperwallFunctions();

    const [loading, setLoading] = useState(true);
    const [activeConstraints, setActiveConstraints] = useState<InjuryConstraint[]>([]);

    useEffect(() => {
        fetchActiveConstraints()
            .then(setActiveConstraints)
            .catch((err) => {
                devError('injury-plan-info: load failed', err);
                useToastStore.getState().show(t('injuries.profile_save_error'));
            })
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const slideValue = useSharedValue(600);
    const overlayValue = useSharedValue(0);
    const entered = useRef(false);
    function handleSheetLayout() {
        if (entered.current) return;
        entered.current = true;
        overlayValue.value = withTiming(1, { duration: 250 });
        slideValue.value = withTiming(0, { duration: 300 });
    }
    const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slideValue.value }] }));
    const backdropStyle = useAnimatedStyle(() => ({ opacity: overlayValue.value }));

    function closeThen(action: () => void) {
        overlayValue.value = withTiming(0, { duration: 200 });
        slideValue.value = withTiming(600, { duration: 200 }, (finished) => {
            if (finished) scheduleOnRN(action);
        });
    }
    function handleClose() {
        closeThen(() => router.back());
    }

    // Mirrors app/new-plan.tsx:115-130 — Sheet schließen, dann Rest-Gate
    // (ensureInjuryGate pusht ggf. '/injury-gate'), dann Paywall-Gate, dann
    // erst in den Generieren-Wizard. app/goals.tsx ist unerreichbarer
    // Legacy-Code — der Wizard-Einstieg ist /generate-plan.
    function handleAdjustPriorities() {
        const errorMessage = t('ui.plan_generate_start_error');
        closeThen(async () => {
            router.back();
            const trigger = () => openWithPlacement('generate_plan', () => router.push('/generate-plan'));
            let gatePassed: boolean;
            try {
                gatePassed = await ensureInjuryGate(router, trigger);
            } catch {
                useToastStore.getState().show(errorMessage);
                return;
            }
            if (!gatePassed) return;
            trigger();
        });
    }

    function tagLabel(slug: string): string {
        return t(`injuries.tag_${slug}` as any) as unknown as string;
    }

    function conflictText(conflict: InjuryConflict): string {
        const specificKey = PILLAR_SPECIFIC_CONFLICT_KEYS[conflict.pillar];
        if (specificKey) return t(specificKey as any) as unknown as string;
        const pillarLabel = t(`category.${conflict.pillar}` as any) as unknown as string;
        return t('injuries.conflict_generic', { pillar: pillarLabel });
    }

    // Binding ruling (Task 7 review): injury_conflicts is NULL on plans
    // without conflicts — never a bare `.map` on the raw field.
    const conflicts = (plan?.injury_conflicts ?? []) as InjuryConflict[];

    return (
        <Reanimated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={styles.backdropPressable} onPress={handleClose}>
                <Pressable onPress={(e) => e.stopPropagation()}>
                    <Reanimated.View
                        onLayout={handleSheetLayout}
                        style={[styles.sheet, { backgroundColor: theme.surface, maxHeight: windowHeight * 0.85 }, sheetStyle]}
                    >
                        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                            <View style={[styles.content, { paddingBottom: insets.bottom + 12 }]}>
                                <View style={[styles.handle, { backgroundColor: theme.borderDivider }]} />

                                <View style={styles.header}>
                                    <JempText type="h2" color={theme.text} style={styles.headerTitle}>
                                        {t('injuries.detail_title')}
                                    </JempText>
                                    <TouchableOpacity onPress={handleClose} hitSlop={8}>
                                        <Ionicons name="close" size={22} color={theme.textMuted} />
                                    </TouchableOpacity>
                                </View>

                                {loading ? (
                                    <View style={styles.loadingBox}>
                                        <ActivityIndicator color={theme.textMuted} />
                                    </View>
                                ) : (
                                    <View style={styles.body}>
                                        {/* 1) Aktive Constraints — read-only, Modus als Chip */}
                                        <View style={styles.section}>
                                            <JempText type="body-l" style={styles.sectionTitle}>
                                                {t('injuries.detail_constraints_title')}
                                            </JempText>
                                            {activeConstraints.length === 0 ? (
                                                <JempText type="body-sm" color={theme.textMuted}>
                                                    {t('injuries.profile_empty')}
                                                </JempText>
                                            ) : (
                                                <View style={styles.constraintList}>
                                                    {activeConstraints.map((c) => (
                                                        <View key={c.id} style={[styles.constraintRow, { backgroundColor: theme.background }]}>
                                                            <JempText type="body-sm" color={theme.text} style={styles.constraintLabel}>
                                                                {tagLabel(c.tag_slug)}
                                                            </JempText>
                                                            <View style={[styles.modeChip, { backgroundColor: `${MODE_COLORS[c.mode]}22` }]}>
                                                                <JempText type="caption" color={MODE_COLORS[c.mode]}>
                                                                    {t(c.mode === 'block' ? 'injuries.choice_block' : 'injuries.choice_light')}
                                                                </JempText>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </View>

                                        {/* 2) Arzt/Akut-Note (Task 6) — lokalisiert aus i18n statt aus
                                            workout_plans.description: das DB-Feld schreibt der Worker
                                            hartkodiert auf Deutsch (prepare-v2 ACUTE_INJURY_NOTE) */}
                                        {activeConstraints.some((c) => c.acute) && (
                                            <View style={styles.section}>
                                                <JempText type="body-sm" color={theme.textMuted}>
                                                    {t('injuries.detail_acute_note')}
                                                </JempText>
                                            </View>
                                        )}

                                        {/* 3) Prio-Konflikte — pro Säule ein Hinweis + gemeinsamer CTA */}
                                        {conflicts.length > 0 && (
                                            <View style={styles.section}>
                                                {conflicts.map((conflict, idx) => (
                                                    <JempText
                                                        key={`${conflict.pillar}-${idx}`}
                                                        type="body-sm"
                                                        color={theme.textMuted}
                                                        style={styles.conflictText}
                                                    >
                                                        {conflictText(conflict)}
                                                    </JempText>
                                                ))}
                                                <TouchableOpacity
                                                    style={[styles.adjustButton, { backgroundColor: `${GradientMid}18` }]}
                                                    onPress={handleAdjustPriorities}
                                                >
                                                    <JempText type="button" color={GradientMid}>
                                                        {t('injuries.conflict_adjust_button')}
                                                    </JempText>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        </ScrollView>
                    </Reanimated.View>
                </Pressable>
            </Pressable>
        </Reanimated.View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    backdropPressable: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        // maxHeight kommt inline als Zahl (windowHeight * 0.85) — Muster wie
        // swap-exercise/session-reschedule, Prozent-Werte löst Yoga hier nicht auf
    },
    content: {
        paddingTop: 12,
        paddingHorizontal: 20,
        gap: 16,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
    },
    headerTitle: { flex: 1 },
    loadingBox: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    body: { gap: 20 },
    section: { gap: 10 },
    sectionTitle: { fontWeight: '600' as const },
    constraintList: { gap: 8 },
    constraintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        gap: 8,
    },
    constraintLabel: { flex: 1 },
    modeChip: {
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 8,
    },
    conflictText: { lineHeight: 20 },
    adjustButton: {
        alignSelf: 'flex-start',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginTop: 4,
    },
});
