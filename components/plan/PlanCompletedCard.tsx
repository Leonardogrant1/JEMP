import { Colors, Cyan, Electric, GradientMid } from "@/constants/theme";
import { kgToLbs } from "@/helpers/units";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCountUp } from "@/hooks/use-count-up";
import { useUnitSystem } from "@/hooks/use-unit-system";
import { useCurrentUser } from "@/providers/current-user-provider";
import { usePlan } from "@/providers/plan-provider";
import { usePlanExerciseProgressQuery } from "@/queries/use-plan-exercise-progress-query";
import { useUserCategoryHistoryQuery } from "@/queries/use-user-category-history-query";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import Reanimated, {
    Easing,
    Extrapolation,
    FadeIn,
    FadeInUp,
    interpolate,
    LinearTransition,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";
import { JempText } from "../jemp-text";
import { StatsStrip, type StatStripItem } from "../profile/stats-strip";
import { AssessmentRow } from "../progress/assessment-row";
import { useTabBarInset } from "../tab-bar";

const TITLE_COLLAPSE_DISTANCE = 70;
// How long the trophy + title stand alone before the rest of the screen loads in
const INTRO_HOLD_MS = 1500;

const titleGlide = LinearTransition.duration(550).easing(Easing.out(Easing.cubic));
const sectionEnter = (delay: number) => FadeInUp.duration(450).delay(delay).easing(Easing.out(Easing.cubic));

interface PlanCompletedCardProps {
    onGenerate: () => void;
}

/** Section header: gradient accent bar + gradient uppercase label */
function SectionHeader({ label }: { label: string }) {
    return (
        <View style={styles.sectionHeaderRow}>
            <LinearGradient
                colors={[Cyan[500], Electric[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.sectionAccentBar}
            />
            <JempText type="button" gradient>{label.toUpperCase()}</JempText>
        </View>
    );
}

/** Segmented bar: completed (gradient) / skipped (muted) / cancelled (red), clip-wipe reveal */
function AdherenceBar({ completed, skipped, cancelled, mutedColor }: {
    completed: number;
    skipped: number;
    cancelled: number;
    mutedColor: string;
}) {
    const [width, setWidth] = useState(0);
    const reveal = useSharedValue(0);
    useEffect(() => {
        if (width === 0) return;
        reveal.value = 0;
        reveal.value = withDelay(150, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    }, [width, reveal]);

    const clipStyle = useAnimatedStyle(() => ({
        width: reveal.value * width,
    }));

    return (
        <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={styles.adherenceTrack}>
            {width > 0 && (
                <Reanimated.View style={[styles.adherenceClip, clipStyle]}>
                    <View style={[styles.adherenceSegments, { width }]}>
                        {completed > 0 && (
                            <LinearGradient
                                colors={[Cyan[500], Electric[500]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.adherenceSegment, { flex: completed }]}
                            />
                        )}
                        {skipped > 0 && <View style={[styles.adherenceSegment, { flex: skipped, backgroundColor: mutedColor }]} />}
                        {cancelled > 0 && <View style={[styles.adherenceSegment, { flex: cancelled, backgroundColor: 'rgba(239,68,68,0.7)' }]} />}
                    </View>
                </Reanimated.View>
            )}
        </View>
    );
}

export function PlanCompletedCard({ onGenerate }: PlanCompletedCardProps) {
    const { t, i18n } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const router = useRouter();

    const { plan, sessions } = usePlan();
    const { profile } = useCurrentUser();
    const { data: history } = useUserCategoryHistoryQuery(profile?.id, plan?.start_date ?? '1970-01-01');
    const { data: planProgress } = usePlanExerciseProgressQuery(plan?.id);
    const unitSystem = useUnitSystem();

    // autoPlay startet nicht zuverlässig, wenn der Screen beim Mount nicht
    // sichtbar ist — deshalb bei jedem Fokus explizit von vorn abspielen
    const trophyRef = useRef<LottieView>(null);
    useFocusEffect(useCallback(() => {
        trophyRef.current?.reset();
        trophyRef.current?.play();
    }, []));

    // Intro: trophy + title stand alone and centered; once the hold is over the
    // rest mounts — the title glides up via layout transition, sections fade in
    const [introDone, setIntroDone] = useState(false);
    useEffect(() => {
        const id = setTimeout(() => setIntroDone(true), INTRO_HOLD_MS);
        return () => clearTimeout(id);
    }, []);

    // Session outcomes: leftover scheduled/in_progress sessions after plan end
    // count as skipped, otherwise the adherence rate never drops without an
    // explicit skip. Rescheduled is a property, not an outcome — legend only.
    const adherence = useMemo(() => {
        let completed = 0, skipped = 0, cancelled = 0, rescheduled = 0;
        for (const s of sessions) {
            if (s.original_scheduled_at) rescheduled++;
            if (s.status === 'completed') completed++;
            else if (s.status === 'cancelled') cancelled++;
            else skipped++;
        }
        const total = completed + skipped + cancelled;
        return {
            completed, skipped, cancelled, rescheduled, total,
            percent: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
    }, [sessions]);

    const adherenceLegend = useMemo(() => {
        const parts: string[] = [];
        if (adherence.completed > 0) parts.push(t('ui.plan_completed_adherence_completed', { count: adherence.completed }));
        if (adherence.skipped > 0) parts.push(t('ui.plan_completed_adherence_skipped', { count: adherence.skipped }));
        if (adherence.cancelled > 0) parts.push(t('ui.plan_completed_adherence_cancelled', { count: adherence.cancelled }));
        return parts.join(' · ');
    }, [adherence, t]);
    const planWeeks = useMemo(() => {
        if (!plan?.start_date || !plan.end_date) return null;
        const ms = new Date(plan.end_date).getTime() - new Date(plan.start_date).getTime();
        return Math.max(1, Math.round(ms / (7 * 24 * 60 * 60 * 1000)));
    }, [plan]);

    // Without a re-assessment the category levels stay flat over the plan —
    // only then nudge towards redoing the assessments
    const hasLevelChange = useMemo(() => {
        if (!history) return false;
        return Object.values(history).some(
            points => points.length >= 2 && points[points.length - 1].score !== points[0].score
        );
    }, [history]);

    const allExercises = useMemo(() => planProgress?.exercises ?? [], [planProgress]);

    // Stats strip: total volume (kg-loaded sets only) + average strength gain.
    // Either can be missing (bodyweight-heavy plan, no load progression) — hide instead of showing 0.
    // Unit and scale are fixed by the final value so they don't flip mid count-up;
    // tonnes animate in tenths to keep one stable decimal.
    const totalVolumeKg = planProgress?.totalVolumeKg ?? 0;
    const volumeDisplay = useMemo(() => {
        if (totalVolumeKg <= 0) return null;
        if (unitSystem === 'imperial') return { target: Math.round(kgToLbs(totalVolumeKg)), scale: 1, unit: 'lbs' };
        if (totalVolumeKg >= 1000) return { target: Math.round(totalVolumeKg / 100), scale: 10, unit: 't' };
        return { target: totalVolumeKg, scale: 1, unit: 'kg' };
    }, [totalVolumeKg, unitSystem]);

    const avgPerformanceGain = useMemo(() => {
        const gains = allExercises
            .filter(e => e.percent !== null)
            .map(e => e.percent as number);
        if (gains.length === 0) return null;
        return Math.round(gains.reduce((sum, g) => sum + g, 0) / gains.length);
    }, [allExercises]);

    // Count-ups start only after the intro so they run while the strip is visible
    const animatedVolume = useCountUp(introDone ? (volumeDisplay?.target ?? null) : null);
    const animatedGain = useCountUp(introDone ? avgPerformanceGain : null);

    const stripItems: StatStripItem[] = [];
    if (volumeDisplay && animatedVolume !== null) {
        const digits = volumeDisplay.scale > 1 ? 1 : 0;
        stripItems.push({
            label: t('ui.plan_completed_volume'),
            value: (animatedVolume / volumeDisplay.scale).toLocaleString(i18n.language, {
                minimumFractionDigits: digits,
                maximumFractionDigits: digits,
            }),
            unit: volumeDisplay.unit,
            gradient: true,
            valueType: 'h1',
        });
    }
    if (avgPerformanceGain !== null && animatedGain !== null) {
        stripItems.push({
            label: t('ui.plan_completed_avg_gain'),
            value: animatedGain > 0 ? `+${animatedGain}` : String(animatedGain),
            unit: '%',
            gradient: avgPerformanceGain > 0,
            valueType: 'h1',
        });
    }

    const tabBarInset = useTabBarInset();

    // Screen title shrinks and fades away while scrolling and grows back at the top
    const scrollY = useSharedValue(0);
    const scrollHandler = useAnimatedScrollHandler(e => {
        scrollY.value = e.contentOffset.y;
    });
    const titleCollapseStyle = useAnimatedStyle(() => ({
        opacity: interpolate(scrollY.value, [0, TITLE_COLLAPSE_DISTANCE * 0.8], [1, 0], Extrapolation.CLAMP),
        height: interpolate(scrollY.value, [0, TITLE_COLLAPSE_DISTANCE], [34, 0], Extrapolation.CLAMP),
    }));
    // The text itself scales down (origin left) so it visibly shrinks instead of
    // being guillotined by the collapsing height
    const titleScaleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(scrollY.value, [0, TITLE_COLLAPSE_DISTANCE], [1, 0.55], Extrapolation.CLAMP) }],
    }));

    if (!plan) return null;

    return (
        <View style={styles.root}>
            <Reanimated.View style={[styles.titleCollapse, titleCollapseStyle]}>
                <Reanimated.View style={[styles.titleScaleWrap, titleScaleStyle]}>
                    <JempText type="h1" style={styles.screenTitle}>{t('ui.plan')}</JempText>
                </Reanimated.View>
            </Reanimated.View>
            <Reanimated.ScrollView
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                contentContainerStyle={[styles.scroll, { paddingBottom: tabBarInset + 68 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Title ── */}
                <Reanimated.View layout={titleGlide} style={styles.titleSection}>
                    <LottieView
                        ref={trophyRef}
                        source={require('@/assets/animations/throphy.json')}
                        loop={false}
                        style={styles.trophyAnimation}
                    />
                    <JempText type="caption" color={GradientMid}>
                        {t('ui.plan_completed_title').toUpperCase()}
                    </JempText>
                    <JempText type="hero" style={styles.centeredText}>{plan.name}</JempText>
                    <JempText type="body-sm" color={theme.textMuted} style={styles.centeredText}>
                        {planWeeks !== null
                            ? t('ui.plan_completed_meta', { weeks: planWeeks, sessions: sessions.length })
                            : t('ui.plan_completed_subtitle')}
                    </JempText>
                </Reanimated.View>

                {/* ── Plan stats ── */}
                {introDone && stripItems.length > 0 && (
                    <Reanimated.View entering={sectionEnter(150)}>
                        <StatsStrip items={stripItems} />
                    </Reanimated.View>
                )}

                {/* ── Session adherence ── */}
                {introDone && adherence.total > 0 && (
                    <Reanimated.View entering={sectionEnter(280)} style={styles.adherenceSection}>
                        <SectionHeader label={t('ui.plan_completed_sessions_header')} />
                        <View style={styles.adherenceRow}>
                            <AdherenceBar
                                completed={adherence.completed}
                                skipped={adherence.skipped}
                                cancelled={adherence.cancelled}
                                mutedColor={theme.borderDivider}
                            />
                            <JempText type="button" color={theme.text}>{adherence.percent} %</JempText>
                        </View>
                        <View style={styles.adherenceLegendRow}>
                            <JempText type="caption" color={theme.textMuted}>{adherenceLegend}</JempText>
                            {adherence.rescheduled > 0 && (
                                <View style={styles.rescheduledBadge}>
                                    <Ionicons name="repeat-outline" size={12} color={theme.textMuted} />
                                    <JempText type="caption" color={theme.textMuted}>
                                        {t('ui.plan_completed_adherence_rescheduled', { count: adherence.rescheduled })}
                                    </JempText>
                                </View>
                            )}
                        </View>
                    </Reanimated.View>
                )}

                {/* ── Exercise improvements ── */}
                {introDone && allExercises.length > 0 && (
                    <Reanimated.View entering={sectionEnter(410)} style={styles.section}>
                        <SectionHeader label={t('ui.plan_completed_exercise_results')} />
                        <View style={styles.exerciseList}>
                            {allExercises.map((e, idx) => (
                                <AssessmentRow
                                    key={e.exerciseId}
                                    index={idx}
                                    bounded={false}
                                    entry={{
                                        assessmentId: e.exerciseId,
                                        name: e.name,
                                        unit: e.metric === 'reps' ? t('ui.reps') : e.unit,
                                        higherIsBetter: true,
                                        firstValue: e.first,
                                        latestValue: e.last,
                                        latestScore: null,
                                        percentChange: e.percent,
                                        entryCount: e.points.length,
                                        history: e.points,
                                    }}
                                />
                            ))}
                        </View>
                    </Reanimated.View>
                )}

                {/* ── Assessment nudge — only while no re-assessment happened during the plan ── */}
                {introDone && !hasLevelChange && (
                    <Reanimated.View entering={sectionEnter(540)}>
                        <Pressable
                            style={styles.nudgeRow}
                            onPress={() => router.navigate('/(tabs)/assessments')}
                        >
                            <JempText type="body-sm" color={theme.textMuted}>
                                {t('ui.plan_completed_assessment_nudge')}
                            </JempText>
                            <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
                        </Pressable>
                    </Reanimated.View>
                )}

            </Reanimated.ScrollView>

            {/* ── Floating CTA — always visible above the tab bar, content fades out underneath ── */}
            {introDone && (
                <Reanimated.View
                    pointerEvents="none"
                    entering={FadeIn.duration(450).delay(650)}
                    style={[styles.ctaScrim, { height: tabBarInset + 96 }]}
                >
                    <LinearGradient
                        colors={[`${theme.background}00`, theme.background]}
                        style={StyleSheet.absoluteFill}
                    />
                </Reanimated.View>
            )}
            {introDone && (
                <Reanimated.View entering={sectionEnter(650)} style={[styles.floatingCta, { bottom: tabBarInset }]}>
                    <TouchableOpacity style={styles.generateBtn} onPress={onGenerate}>
                        <LinearGradient
                            colors={[Cyan[500], Electric[500]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.generateBtnGradient}
                        >
                            <JempText type="button" color="#fff">{t('ui.plan_completed_generate')}</JempText>
                        </LinearGradient>
                    </TouchableOpacity>
                </Reanimated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    titleCollapse: { overflow: 'hidden' },
    titleScaleWrap: { transformOrigin: 'left center', alignSelf: 'flex-start' },
    screenTitle: { letterSpacing: -0.5 },

    scroll: { gap: 20, paddingBottom: 24, paddingTop: 76, flexGrow: 1, justifyContent: 'center' },

    titleSection: { alignItems: 'center', gap: 6 },
    trophyAnimation: { width: 72, height: 72, marginBottom: -4 },
    centeredText: { textAlign: 'center' },

    section: { gap: 8, marginTop: 10 },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionAccentBar: { width: 3, height: 24, borderRadius: 2 },

    adherenceSection: { gap: 8, marginTop: 10 },
    adherenceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    adherenceLegendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rescheduledBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    adherenceTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
    adherenceClip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
    adherenceSegments: { height: '100%', flexDirection: 'row', gap: 2 },
    adherenceSegment: { height: '100%', borderRadius: 3 },

    exerciseList: { gap: 10 },
    nudgeRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2,
        paddingVertical: 4,
    },

    ctaScrim: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    floatingCta: {
        position: 'absolute', left: 0, right: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    generateBtn: { borderRadius: 100, overflow: 'hidden' },
    generateBtnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
});
