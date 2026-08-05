import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { computeLoadProfile } from '@/lib/load-profile';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { useAuth } from '@/providers/auth-provider';
import { queryKeys } from '@/queries/query-keys';
import { supabase } from '@/services/supabase/client';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn } from 'react-native-reanimated';

// Checklisten-Phasen — Fortschritt läuft zeitgesteuert, während save() im
// Hintergrund die echten Writes macht (Optik wie PlanGenerationScreen)
const PHASES = [
    { threshold: 0, labelKey: 'personalization.stage_saving' },
    { threshold: 30, labelKey: 'personalization.stage_goals' },
    { threshold: 60, labelKey: 'personalization.stage_equipment' },
] as const;

const MIN_DURATION_MS = 9000;
const COMPLETED_HOLD_MS = 1400;

export function PersonalizationStep() {
    const { t } = useTranslation();
    const { nextStep } = useOnboardingControl();
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const onboardingData = useOnboardingStore();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const [progress, setProgress] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasStarted = useRef(false);
    const startedAt = useRef(Date.now());
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Progress tick — crawls to 85% over ~8s so the screen stays up
    useEffect(() => {
        if (error) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }
        intervalRef.current = setInterval(() => {
            setProgress(prev => {
                if (prev >= 85) return prev;
                return Math.min(85, prev + 1.1);
            });
        }, 100);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [error]);

    // Sprint to 100% when done — but only after MIN_DURATION_MS from mount
    useEffect(() => {
        if (!isComplete) return;
        const elapsed = Date.now() - startedAt.current;
        const delay = Math.max(0, MIN_DURATION_MS - elapsed);
        const timeout = setTimeout(() => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            const sprint = setInterval(() => {
                setProgress(prev => Math.min(100, prev + 5));
            }, 16);
            intervalRef.current = sprint;
        }, delay);
        return () => clearTimeout(timeout);
    }, [isComplete]);

    const isCompleted = progress >= 100;
    // Letzte Phase, deren Schwelle erreicht ist; completed hakt alles ab
    const activeIndex = isCompleted
        ? PHASES.length
        : PHASES.reduce((acc, p, i) => (progress >= p.threshold ? i : acc), 0);

    // Haptik rastet mit der Checkliste ein: Tick pro Phase, Success am Ende
    const prevIndexRef = useRef(0);
    useEffect(() => {
        const prev = prevIndexRef.current;
        prevIndexRef.current = activeIndex;
        if (activeIndex <= prev) return;
        if (isCompleted) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [activeIndex, isCompleted]);

    // Check-Moment kurz stehen lassen, dann weiter
    useEffect(() => {
        if (!isCompleted) return;
        const timer = setTimeout(nextStep, COMPLETED_HOLD_MS);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCompleted]);

    // Run on mount
    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function save() {
        setError(null);
        setIsComplete(false);
        try {
            if (!session) throw new Error('Not authenticated');

            const {
                set, reset,
                sport_slug,
                targetedCategories,
                categoryLevels,
                equipmentIds,
                environmentIds,
                dayEnvironments,
                equipmentEnvironments,
                weekly_schedule,
                name_source,
                ...profileData
            } = onboardingData;

            const { load_score, load_profile } = computeLoadProfile(weekly_schedule?.sessions ?? []);

            const { error: profileError } = await supabase
                .from('user_profiles')
                .update({
                    ...profileData,
                    weekly_schedule: weekly_schedule as any,
                    load_score,
                    load_profile,
                    day_environments: dayEnvironments.length > 0 ? dayEnvironments : null,
                })
                .eq('id', session.user.id);
            if (profileError) throw profileError;

            await Promise.all([
                supabase.from('user_targeted_categories').delete().eq('user_id', session.user.id),
                supabase.from('user_category_levels').delete().eq('user_id', session.user.id),
                supabase.from('user_environments').delete().eq('user_id', session.user.id),
                supabase.from('user_equipments').delete().eq('user_id', session.user.id),
                (supabase as any).from('user_equipment_environments').delete().eq('user_id', session.user.id),
            ]);

            if (targetedCategories.length > 0) {
                const { error: e } = await supabase.from('user_targeted_categories').insert(
                    targetedCategories.map(({ categoryId, priority }) => ({ user_id: session.user.id, category_id: categoryId, priority }))
                );
                if (e) throw e;
            }

            if (categoryLevels.length > 0) {
                const { error: e } = await supabase.from('user_category_levels').insert(
                    categoryLevels.map(({ categoryId, score }) => ({ user_id: session.user.id, category_id: categoryId, level_score: score }))
                );
                if (e) throw e;
            }

            if (environmentIds.length > 0) {
                const { error: e } = await supabase.from('user_environments').insert(
                    environmentIds.map(environment_id => ({ user_id: session.user.id, environment_id }))
                );
                if (e) throw e;
            }

            if (equipmentIds.length > 0) {
                const { error: e } = await supabase.from('user_equipments').insert(
                    equipmentIds.map(equipment_id => ({ user_id: session.user.id, equipment_id }))
                );
                if (e) throw e;
            }

            if (equipmentEnvironments.length > 0) {
                const { error: e } = await (supabase as any).from('user_equipment_environments').insert(
                    equipmentEnvironments.map(({ equipment_id, environment_id }) => ({
                        user_id: session.user.id,
                        equipment_id,
                        environment_id,
                    }))
                );
                if (e) throw e;
            }

            queryClient.invalidateQueries({ queryKey: queryKeys.plan(session.user.id) });
            setIsComplete(true);
        } catch (err: any) {
            setError(err?.message ?? t('personalization.error'));
        }
    }

    if (error) {
        return (
            <View style={styles.center}>
                <View style={[styles.errorIconBox, { backgroundColor: '#ef444418' }]}>
                    <Ionicons name="close-circle-outline" size={52} color="#ef4444" />
                </View>
                <JempText type="h2" color={theme.text} style={styles.textCenter}>
                    {t('plan.error_title')}
                </JempText>
                <JempText type="caption" color={theme.textMuted} style={styles.textCenter}>
                    {error}
                </JempText>
                <TouchableOpacity
                    style={[styles.retryBtn, { backgroundColor: theme.surface }]}
                    onPress={() => { hasStarted.current = false; save(); }}
                >
                    <JempText type="body-l" color={theme.text}>{t('ui.retry')}</JempText>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            {/* ── Completed-Overlay: Rest fadet weg, Check-Animation fadet rein ── */}
            {isCompleted && (
                <Animated.View entering={FadeIn.delay(150).duration(350)} style={[StyleSheet.absoluteFill, styles.content]}>
                    <LottieView
                        source={require('@/assets/animations/check.json')}
                        autoPlay
                        loop={false}
                        style={styles.animation}
                    />
                    <JempText type="h1" color={theme.text} style={styles.title}>
                        {t('personalization.stage_done')}
                    </JempText>
                </Animated.View>
            )}

            {!isCompleted && (
                <Animated.View exiting={FadeOut.duration(250)} style={[StyleSheet.absoluteFill, styles.content]}>
                    <LottieView
                        source={require('@/assets/animations/clipboard-loading.json')}
                        autoPlay
                        loop
                        style={styles.animation}
                    />

                    <JempText type="h1" color={theme.text} style={styles.title}>
                        {t('personalization.title')}
                    </JempText>

                    {/* ── Phasen-Checkliste: ✓ erledigt, Spinner aktiv, offen muted ── */}
                    <View style={styles.phases}>
                        {PHASES.map((phase, i) => {
                            const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending';
                            return (
                                <Animated.View
                                    key={phase.labelKey}
                                    entering={FadeInDown.delay(i * 120 + 200).duration(400)}
                                    style={styles.phaseRow}
                                >
                                    <View style={styles.phaseIcon}>
                                        {/* key remountet beim Zustandswechsel → Icon poppt weich rein */}
                                        <Animated.View key={state} entering={ZoomIn.duration(250)}>
                                            {state === 'done' && (
                                                <Ionicons name="checkmark-circle" size={26} color={GradientMid} />
                                            )}
                                            {state === 'active' && (
                                                <LottieView
                                                    source={require('@/assets/animations/spinner-arc.json')}
                                                    autoPlay
                                                    loop
                                                    style={styles.spinner}
                                                />
                                            )}
                                            {state === 'pending' && (
                                                <Ionicons name="ellipse-outline" size={24} color={theme.textSubtle} />
                                            )}
                                        </Animated.View>
                                    </View>
                                    <Animated.View key={`label-${state}`} entering={FadeIn.duration(300)}>
                                        <JempText
                                            type="body-l"
                                            color={state === 'active' ? theme.text : state === 'done' ? theme.textMuted : theme.textSubtle}
                                            style={[styles.phaseLabel, state === 'done' && styles.phaseDone]}
                                        >
                                            {t(phase.labelKey)}
                                        </JempText>
                                    </Animated.View>
                                </Animated.View>
                            );
                        })}
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, gap: 20 },
    animation: { width: 120, height: 120, alignSelf: 'center', marginBottom: -8 },
    title: { textAlign: 'center' },
    phases: { gap: 22, marginTop: 12, alignSelf: 'center' },
    phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    phaseIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    spinner: { width: 30, height: 30 },
    phaseLabel: { fontSize: 18, lineHeight: 26 },
    phaseDone: { textDecorationLine: 'line-through', opacity: 0.6 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
    errorIconBox: { borderRadius: 40, padding: 16 },
    textCenter: { textAlign: 'center' },
    retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
});
