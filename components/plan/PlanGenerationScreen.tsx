import { Colors, GradientMid } from "@/constants/theme";
import { getStageLabel } from "@/helpers/plan-generation-helpers";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { usePlanGenerationStore } from "@/stores/plan-generation-store";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import LottieView from "lottie-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn } from 'react-native-reanimated';
import { JempText } from "../jemp-text";
import { useTabBarInset } from "../tab-bar";

// Die Phasen der Generierung in Backend-Reihenfolge
const PHASES = [
    { status: 'fetching_data', labelKey: 'planGeneration.fetching_data' },
    { status: 'planning_week', labelKey: 'planGeneration.planning_week' },
    { status: 'generating_session', labelKey: 'planGeneration.generating_sessions' },
    { status: 'saving', labelKey: 'planGeneration.saving' },
] as const;

// DEV preview cycles through the real stages so the phase list can be designed live
const PREVIEW_STATUSES = ['fetching_data', 'planning_week', 'generating_session', 'saving', 'completed'];

export function PlanGenerationScreen({ preview = false }: { preview?: boolean } = {}) {
    const { t } = useTranslation();
    const { job, isGenerating, isError } = usePlanGenerationStore();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    // autoPlay startet nicht zuverlässig, wenn der Screen beim Mount nicht
    // sichtbar ist — deshalb bei jedem Fokus explizit von vorn abspielen
    const lottieRef = useRef<LottieView>(null);
    useFocusEffect(useCallback(() => {
        lottieRef.current?.reset();
        lottieRef.current?.play();
    }, []));

    const [previewStage, setPreviewStage] = useState(0);
    useEffect(() => {
        if (!preview) return;
        const id = setInterval(() => setPreviewStage(s => (s + 1) % PREVIEW_STATUSES.length), 2500);
        return () => clearInterval(id);
    }, [preview]);

    const status = job?.status ?? (preview ? PREVIEW_STATUSES[previewStage] : null);

    // Index der aktiven Phase; unbekannte/frühe Status zählen als erste Phase,
    // completed hakt alles ab
    const activeIndex = status === 'completed'
        ? PHASES.length
        : Math.max(0, PHASES.findIndex(p => p.status === status));
    const isCompleted = status === 'completed';
    // Vertikal etwas nach oben zentrieren — der halbe Tab-Bar-Inset trifft die optische Mitte
    const bottomInset = useTabBarInset() / 2;

    // Haptik rastet mit der Checkliste ein: Tick pro geschafftem Step, Success am Ende.
    // Beim Mount mitten in einer laufenden Generation bleibt es still (prev === -1).
    const prevIndexRef = useRef(-1);
    useEffect(() => {
        const prev = prevIndexRef.current;
        prevIndexRef.current = activeIndex;
        if (prev === -1 || activeIndex <= prev) return;
        if (isCompleted) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [activeIndex, isCompleted]);

    useEffect(() => {
        if (isError) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }, [isError]);

    return (
        <View style={styles.pgRoot}>
            {/* ── Completed-Overlay: Rest fadet weg, Check-Animation fadet rein ── */}
            {isCompleted && (
                <Animated.View entering={FadeIn.delay(150).duration(350)} style={[StyleSheet.absoluteFill, styles.pgContent, { paddingBottom: bottomInset }]}>
                    <LottieView
                        source={require('@/assets/animations/check.json')}
                        autoPlay
                        loop={false}
                        style={styles.pgAnimation}
                    />
                    <JempText type="h1" color={theme.text} style={styles.pgTitle}>
                        {t('planGeneration.completed_label')}
                    </JempText>
                </Animated.View>
            )}

            {!isCompleted && (
            <Animated.View exiting={FadeOut.duration(250)} style={[StyleSheet.absoluteFill, styles.pgContent, { paddingBottom: bottomInset }]}>
                {!isError && (
                    <LottieView
                        ref={lottieRef}
                        source={require('@/assets/animations/clipboard-loading.json')}
                        loop
                        style={styles.pgAnimation}
                    />
                )}

                <JempText type="h1" color={theme.text} style={styles.pgTitle}>
                    {isError ? t('planGeneration.error_title') : t('planGeneration.title')}
                </JempText>

                {/* ── Phasen-Checkliste: ✓ erledigt, Spinner aktiv (✕ bei Fehler), offen muted ── */}
                <View style={styles.pgPhases}>
                    {PHASES.map((phase, i) => {
                        const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending';
                        const label = phase.status === 'generating_session' && state === 'active' && job?.phase_detail
                            ? getStageLabel(t, 'generating_session', job.phase_detail)
                            : t(phase.labelKey);
                        return (
                            <Animated.View
                                key={phase.status}
                                entering={FadeInDown.delay(i * 120 + 200).duration(400)}
                                style={styles.pgPhaseRow}
                            >
                                <View style={styles.pgPhaseIcon}>
                                    {/* key remountet beim Zustandswechsel → Icon poppt weich rein statt hart zu tauschen */}
                                    <Animated.View key={`${state}-${isError ? 'err' : 'ok'}`} entering={ZoomIn.duration(250)}>
                                        {state === 'done' && (
                                            <Ionicons name="checkmark-circle" size={26} color={GradientMid} />
                                        )}
                                        {state === 'active' && (isError
                                            ? <Ionicons name="close-circle" size={26} color="#ef4444" />
                                            : <LottieView
                                                source={require('@/assets/animations/spinner-arc.json')}
                                                autoPlay
                                                loop
                                                style={styles.pgSpinner}
                                            />
                                        )}
                                        {state === 'pending' && (
                                            <Ionicons name="ellipse-outline" size={24} color={theme.textSubtle} />
                                        )}
                                    </Animated.View>
                                </View>
                                <Animated.View key={state} entering={FadeIn.duration(300)}>
                                    <JempText
                                        type="body-l"
                                        color={state === 'active' ? theme.text : state === 'done' ? theme.textMuted : theme.textSubtle}
                                        style={[styles.pgPhaseLabel, state === 'done' && styles.pgPhaseDone]}
                                    >
                                        {label}
                                    </JempText>
                                </Animated.View>
                            </Animated.View>
                        );
                    })}
                </View>

                {isGenerating && (
                    <JempText type="caption" color={theme.textMuted} style={styles.pgHint}>
                        {t('planGeneration.notify_hint')}
                    </JempText>
                )}

                {isError && (
                    <JempText type="caption" color="#ef4444" style={styles.pgHint}>
                        {job?.error ?? t('planGeneration.error_generic')}
                    </JempText>
                )}
            </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    // Plan generation fullscreen
    pgRoot: { flex: 1 },
    pgContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, gap: 20 },
    pgAnimation: { width: 120, height: 120, alignSelf: 'center', marginBottom: -8 },
    pgTitle: { textAlign: 'center' },
    pgPhases: { gap: 22, marginTop: 12, alignSelf: 'center' },
    pgPhaseRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    pgPhaseIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    pgSpinner: { width: 30, height: 30 },
    pgPhaseLabel: { fontSize: 18, lineHeight: 26 },
    pgPhaseDone: { textDecorationLine: 'line-through', opacity: 0.6 },
    pgHint: { textAlign: 'center', marginTop: 4 },
})
