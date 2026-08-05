import { JempText } from '@/components/jemp-text';
import { EmptyPlanCard } from '@/components/plan/EmptyPlanCard';
import { PlanCompletedCard } from '@/components/plan/PlanCompletedCard';
import { PlanGenerationScreen } from '@/components/plan/PlanGenerationScreen';
import { PlanSessionCard } from '@/components/plan/PlanSessionCard';
import { SessionCard } from '@/components/plan/SessionCard';
import { SessionPager } from '@/components/plan/SessionPager';
import { StatsCard } from '@/components/plan/StatsCard';
import { WeekStrip } from '@/components/plan/WeekStrip';
import { useTabBarInset } from '@/components/tab-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { type DayVariant, RestDayCard } from '@/components/rest-day-card';
import { MONTHS } from '@/constants/date-constants';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { getISOWeek, getPreviewSession, getWeekDays, toDateStr } from '@/helpers/date-helpers';
import { getDayVariant, toDatabaseDow } from '@/helpers/session-helpers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hasCompletePlanSettings } from '@/lib/plan-settings-complete';
import { startPlanGeneration } from '@/lib/start-plan-generation';
import { useCurrentUser } from '@/providers/current-user-provider';
import { type PlanSession, type WorkoutSession, usePlan } from '@/providers/plan-provider';
import { useSuperwallFunctions } from '@/services/purchases/superwall/useSuperwall';
import { useDevToolsStore } from '@/stores/dev-tools-store';
import { usePlanGenerationStore } from '@/stores/plan-generation-store';
import { useToastStore } from '@/stores/toast-store';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import Reanimated, { Easing, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function PlanScreen() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { plan, sessions, planSessions, isLoading, streak, refresh } = usePlan();
    const { profile } = useCurrentUser();
    const { openWithPlacement } = useSuperwallFunctions();

    const subscribe = usePlanGenerationStore(s => s.subscribe);
    const unsubscribe = usePlanGenerationStore(s => s.unsubscribe);
    const clear = usePlanGenerationStore(s => s.clear);
    const jobStatus = usePlanGenerationStore(s => s.job?.status);
    const isGenerating = usePlanGenerationStore(s => s.isGenerating);
    const isError = usePlanGenerationStore(s => s.isError);


    useEffect(() => {
        if (profile?.id) {
            subscribe(profile.id);
            return () => unsubscribe();
        }
    }, [profile?.id]);

    // When generation completes, refresh plan data and clear the job state
    useEffect(() => {
        if (jobStatus === 'completed') {
            refresh().then(() => clear());
        }
    }, [jobStatus]);


    const [selectedDay, setSelectedDay] = useState<Date>(new Date());

    const today = new Date();
    const weekDays = useMemo(() => getWeekDays(today), [today]);

    // Plan has run past its end date — no sessions exist beyond it, so show
    // a completion state with a CTA instead of an empty week
    const planExpired = !!plan?.end_date && plan.end_date < toDateStr(today);

    const weekNumber = getISOWeek(today);
    const month = MONTHS[today.getMonth()];
    const todayIndex = useMemo(() => weekDays.findIndex(
        d => d.getDate() === today.getDate() && d.getMonth() === today.getMonth()
    ), [weekDays, today]);

    // Map day_of_week (1=Mo…7=So) → plan template session
    const planSessionByDow = useMemo(() => {
        const map = new Map<number, PlanSession>();
        for (const ps of planSessions) map.set(ps.day_of_week, ps);
        return map;
    }, [planSessions]);


    // Days in current week that have at least one session (real or plan-template preview)
    const weekSessionDays = useMemo(() => {
        const set = new Set(
            sessions
                .map(s => toDateStr(new Date(s.scheduled_at!)))
                .filter(dateStr => weekDays.some(wd => toDateStr(wd) === dateStr))
        );
        // Add plan-template previews for days without a real session
        for (const day of weekDays) {
            if (!set.has(toDateStr(day))) {
                const preview = getPreviewSession(day, sessions, planSessionByDow);
                if (preview) set.add(toDateStr(day));
            }
        }
        return set;
    }, [sessions, weekDays, planSessionByDow]);

    // Sessions for the tapped day
    const selectedDayStr = toDateStr(selectedDay);
    const selectedDaySessions = useMemo(() => sessions.filter(
        s => toDateStr(new Date(s.scheduled_at!)) === selectedDayStr
    ), [sessions, selectedDayStr]);

    // Plan-template preview for tapped day (only when no real session scheduled for that exact day)
    const selectedDayPreview = useMemo(() => {
        return getPreviewSession(selectedDay, sessions, planSessionByDow);
    }, [selectedDay, sessions, planSessionByDow]);

    // Day variant from weekly_schedule
    const selectedDayVariant = useMemo((): DayVariant => {
        return getDayVariant(selectedDay, profile?.weekly_schedule, profile?.sport?.slug);
    }, [selectedDay, profile]);

    function renderSessionCard(session: WorkoutSession) {
        return (
            <SessionCard
                session={session}
                theme={theme}
            />
        );
    }

    function renderSessionActions(session: WorkoutSession) {
        if (session.status !== 'scheduled') return null;
        return (
            <View style={styles.sessionActionRow}>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.surface }]}
                    onPress={() => {
                        router.push({ pathname: '/session-manage', params: { sessionId: session.id } });
                    }}
                >
                    <JempText type="button" color={theme.text}>{t('ui.session_manage_title')}</JempText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionBtnGradient}
                    onPress={() => router.push(`/session/${session.id}`)}
                >
                    <LinearGradient
                        colors={[Cyan[500], Electric[500]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.actionBtnGradientInner}
                    >
                        <JempText type="button" color="#fff">{t('ui.view_details')}</JempText>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        );
    }

    function renderSelectedDayContent() {
        if (selectedDaySessions.length > 0) {
            return (
                <SessionPager
                    sessions={selectedDaySessions}
                    theme={theme}
                    renderCard={renderSessionCard}
                    renderActions={renderSessionActions}
                />
            );
        }

        if (selectedDayPreview) {
            return (
                <PlanSessionCard
                    key={selectedDayPreview.id}
                    planSession={selectedDayPreview}
                    theme={theme}
                />
            );
        }

        return <RestDayCard variant={selectedDayVariant} sport={profile?.sport} />;
    }

    // Statt direkt zu generieren führt der Weg durch den Plan-Wizard
    // (/generate-plan) — der speichert Einstellungen und triggert das Backend
    function openPlanWizard() {
        openWithPlacement('generate_plan', () => router.push('/generate-plan'));
    }

    // Routing je nach Datenlage:
    // - Einstellungen unvollständig → Wizard (egal ob schon ein Plan existierte)
    // - komplett, aber noch nie ein Plan → Generierung direkt starten
    // - komplett und Plan existiert(e) → /new-plan-Sheet mit der Wahl
    const decidingRef = useRef(false);
    async function handleGeneratePress() {
        if (!profile) { openPlanWizard(); return; }
        if (decidingRef.current) return;
        decidingRef.current = true;
        try {
            const complete = await hasCompletePlanSettings(profile);
            if (!complete) { openPlanWizard(); return; }
            if (plan) { router.push('/new-plan'); return; }
            openWithPlacement('generate_plan', () => {
                startPlanGeneration().catch(() => {
                    useToastStore.getState().show(t('ui.plan_generate_start_error'));
                });
            });
        } finally {
            decidingRef.current = false;
        }
    }

    const forcePlanEmpty = useDevToolsStore(s => s.forcePlanEmpty);
    const devForceEmpty = __DEV__ && forcePlanEmpty;
    const showGenerationScreen = isGenerating || isError;
    const tabBarInset = useTabBarInset();

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>

            {showGenerationScreen ? (
                <PlanGenerationScreen />
            ) : (
                // Completed-State scrollt selbst hinter die Bar (eigener Inset in PlanCompletedCard)
                <View style={[styles.content, { paddingBottom: planExpired ? 0 : tabBarInset }]} >

                    {/* Header — the completed state brings its own collapsing title */}
                    {!planExpired && (
                        <View style={styles.headerRow}>
                            <JempText type="h1" style={styles.title}>{t('ui.plan')}</JempText>
                            {plan && (
                                <Pressable
                                    onPress={handleGeneratePress}
                                    hitSlop={8}
                                    style={styles.newPlanBtn}
                                >
                                    <Ionicons name="sparkles" size={22} color={GradientMid} />
                                </Pressable>
                            )}
                        </View>
                    )}

                    {isLoading ? (
                        <>
                            {/* Layout-treues Skeleton: StatsCard, Week-Info + Kacheln, Session-Card */}
                            <Skeleton height={110} borderRadius={16} />
                            <View style={styles.weekBlock}>
                                <View style={styles.weekInfoRow}>
                                    <Skeleton width={90} height={14} />
                                    <Skeleton width={60} height={14} />
                                </View>
                                <View style={styles.skeletonWeekRow}>
                                    {Array.from({ length: 7 }, (_, i) => (
                                        <Skeleton key={i} height={62} borderRadius={10} style={styles.skeletonDayTile} />
                                    ))}
                                </View>
                            </View>
                            <Skeleton borderRadius={20} style={styles.skeletonDayContent} />
                        </>
                    ) : !plan || devForceEmpty ? (
                        <EmptyPlanCard onGenerate={handleGeneratePress} />
                    ) : planExpired ? (
                        <PlanCompletedCard onGenerate={handleGeneratePress} />
                    ) : (
                        <>
                            <StatsCard />

                            {/* Week strip — Monat + KW sitzen horizontal direkt über den Tagen */}
                            <View style={styles.weekBlock}>
                                <View style={styles.weekInfoRow}>
                                    <JempText type="body-sm" color={theme.textMuted}>{month} {today.getFullYear()}</JempText>
                                    <JempText type="body-sm" gradient color={theme.primary}>Week {weekNumber}</JempText>
                                </View>
                                <WeekStrip
                                    weekDays={weekDays}
                                    todayIndex={todayIndex}
                                    selectedDay={selectedDay}
                                    setSelectedDay={setSelectedDay}
                                    weekSessionDays={weekSessionDays}
                                />
                            </View>

                            {/* Sessions for selected day — remounts per day so the switch fades in */}
                            <Reanimated.View
                                key={selectedDayStr}
                                entering={FadeInDown.duration(250).easing(Easing.out(Easing.cubic))}
                                style={styles.dayContent}
                            >
                                {renderSelectedDayContent()}
                            </Reanimated.View>
                        </>
                    )}
                </View>
            )}

        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 20, flex: 1 },

    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { letterSpacing: -0.5 },
    newPlanBtn: { padding: 4 },
    weekBlock: { gap: 8 },
    weekInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },

    centered: { paddingTop: 60, alignItems: 'center', flex: 1, justifyContent: "center" },

    dayContent: { flex: 1, gap: 20 },

    // Loading skeleton
    skeletonWeekRow: { flexDirection: 'row', gap: 4 },
    skeletonDayTile: { flex: 1 },
    skeletonDayContent: { flex: 1 },


    // Sessions
    // sessionList: { gap: 16, height: "100%" },
    sessionCard: { position: "relative", borderRadius: 20, overflow: 'hidden', flex: 1 },
    cardContent: { position: 'absolute', bottom: 20, left: 20, right: 20, gap: 8 },
    sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cta: { borderRadius: 100, overflow: 'hidden', marginTop: 4 },
    ctaGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },

    // Rest
    restCard: { borderRadius: 16, alignItems: 'center', gap: 8, flex: 1, justifyContent: "center" },


    // Session action buttons
    sessionActionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        gap: 6,
    },
    actionBtnGradient: {
        flex: 1,
        borderRadius: 14,
        overflow: 'hidden',
    },
    actionBtnGradientInner: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
