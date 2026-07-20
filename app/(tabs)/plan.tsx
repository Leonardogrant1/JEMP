import { JempText } from '@/components/jemp-text';
import { EmptyPlanCard } from '@/components/plan/EmptyPlanCard';
import { PlanCompletedCard } from '@/components/plan/PlanCompletedCard';
import { PlanGenerationScreen } from '@/components/plan/PlanGenerationScreen';
import { PlanSessionCard } from '@/components/plan/PlanSessionCard';
import { SessionCard } from '@/components/plan/SessionCard';
import { StatsCard } from '@/components/plan/StatsCard';
import { WeekStrip } from '@/components/plan/WeekStrip';
import { type DayVariant, RestDayCard } from '@/components/rest-day-card';
import { MONTHS } from '@/constants/date-constants';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { getISOWeek, getPreviewSession, getWeekDays, toDateStr } from '@/helpers/date-helpers';
import { getDayVariant, toDatabaseDow } from '@/helpers/session-helpers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { type PlanSession, usePlan } from '@/providers/plan-provider';
import { supabase } from '@/services/supabase/client';
import { usePlanGenerationStore } from '@/stores/plan-generation-store';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function PlanScreen() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { plan, sessions, planSessions, isLoading, streak, refresh } = usePlan();
    const { profile } = useCurrentUser();

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


    // When a user opens this route with a date parameter, we want to select that day.
    const { date } = useLocalSearchParams<{ date?: string }>();
    const [selectedDay, setSelectedDay] = useState<Date>(new Date());
    const appliedDate = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (date && date !== appliedDate.current) {
            appliedDate.current = date;
            setSelectedDay(new Date(date));
        }
    }, [date]);

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

    function renderSelectedDayContent() {
        if (selectedDaySessions.length > 0) {
            const session = selectedDaySessions[0];
            return (
                <>
                    <SessionCard
                        key={session.id}
                        session={session}
                        theme={theme}
                    />
                    {session.status === 'scheduled' && (
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
                    )}
                </>
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

        return <RestDayCard variant={selectedDayVariant} />;
    }

    const generatingRef = useRef(false);

    async function startGeneration() {
        if (generatingRef.current) return;
        generatingRef.current = true;

        try {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            if (!authSession) return;

            usePlanGenerationStore.getState().subscribe(authSession.user.id);

            const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
            const res = await fetch(`${backendUrl}/api/plan-generation/start`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${authSession.access_token}` },
            });

            if (!res.ok) {
                usePlanGenerationStore.getState().clear();
            }
        } finally {
            generatingRef.current = false;
        }
    }

    const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);

    function handleConfirmGeneration() {
        setShowGenerateConfirm(false);
        startGeneration();
    }

    const showGenerationScreen = isGenerating || isError;

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>

            {showGenerationScreen ? (
                <PlanGenerationScreen />
            ) : (
                <View style={styles.content} >

                    {/* Header */}
                    <View style={styles.headerRow}>
                        <JempText type="h1" style={styles.title}>{t('ui.plan')}</JempText>
                        <View style={styles.weekInfo}>
                            <JempText type="body-sm" color={theme.textMuted}>{month} {today.getFullYear()}</JempText>
                            <JempText type="body-sm" gradient color={theme.primary}>Week {weekNumber}</JempText>
                        </View>
                    </View>

                    {isLoading ? (
                        <View style={styles.centered}>
                            <ActivityIndicator color={theme.primary} />
                        </View>
                    ) : !plan ? (
                        <EmptyPlanCard onGenerate={startGeneration} />
                    ) : planExpired ? (
                        <PlanCompletedCard planId={plan.id} planName={plan.name} planStartDate={plan.start_date} onGenerate={() => setShowGenerateConfirm(true)} />
                    ) : (
                        <>
                            <StatsCard />

                            {/* Week strip */}
                            <WeekStrip
                                weekDays={weekDays}
                                todayIndex={todayIndex}
                                selectedDay={selectedDay}
                                setSelectedDay={setSelectedDay}
                                weekSessionDays={weekSessionDays}
                            />

                            {/* Sessions for selected day */}
                            {renderSelectedDayContent()}
                        </>
                    )}
                </View>
            )}

            {/* ── Generate-plan confirm ── */}
            <Modal transparent animationType="fade" visible={showGenerateConfirm} statusBarTranslucent>
                <Pressable style={styles.confirmOverlay} onPress={() => setShowGenerateConfirm(false)}>
                    <Pressable onPress={(e) => e.stopPropagation()} style={styles.confirmCardWrap}>
                        <View style={[styles.confirmCard, { backgroundColor: theme.surface }]}>
                            <JempText type="h2" style={{ textAlign: 'center' }}>
                                {t('ui.plan_generate_confirm_title')}
                            </JempText>
                            <JempText type="body-l" color={theme.textMuted} style={styles.confirmBody}>
                                {t('ui.plan_generate_confirm_body')}
                            </JempText>
                            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmGeneration}>
                                <LinearGradient
                                    colors={[Cyan[500], Electric[500]]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.confirmBtnGradient}
                                >
                                    <JempText type="button" color="#fff">{t('ui.plan_completed_generate')}</JempText>
                                </LinearGradient>
                            </TouchableOpacity>
                            <Pressable style={styles.confirmCancel} onPress={() => setShowGenerateConfirm(false)}>
                                <JempText type="body-l" color={theme.textMuted}>{t('ui.cancel')}</JempText>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 20, height: "100%" },

    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    title: { letterSpacing: -0.5 },
    weekInfo: { alignItems: 'flex-end', gap: 2, paddingBottom: 4 },

    centered: { paddingTop: 60, alignItems: 'center', flex: 1, justifyContent: "center" },


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

    // Generate-plan confirm modal
    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    confirmCardWrap: { width: '100%' },
    confirmCard: {
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        gap: 14,
    },
    confirmBody: { textAlign: 'center', lineHeight: 22 },
    confirmBtn: { marginTop: 6, width: '100%', borderRadius: 100, overflow: 'hidden' },
    confirmBtnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
    confirmCancel: { paddingVertical: 8 },
});
