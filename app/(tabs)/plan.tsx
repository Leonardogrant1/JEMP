import { JempText } from '@/components/jemp-text';
import { type DayVariant, RestDayCard } from '@/components/rest-day-card';
import { getSessionImage } from '@/constants/session-images';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRescheduleSession } from '@/mutations/use-reschedule-session';
import { useUpdateSessionStatus } from '@/mutations/use-update-session-status';
import { useCurrentUser } from '@/providers/current-user-provider';
import { type PlanSession, type SessionStatus, type WorkoutSession, usePlan } from '@/providers/plan-provider';
import { usePlanGenerationStore } from '@/stores/plan-generation-store';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Date helpers ──────────────────────────────────────────────────────────

const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

function getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekDays(date: Date): Date[] {
    const dow = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - (dow === 0 ? 6 : dow - 1));
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

function toDateStr(date: Date): string {
    return date.toISOString().split('T')[0];
}

// ── Status badge ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<SessionStatus, string> = {
    scheduled: '#8c8c8c',
    in_progress: '#f59e0b',
    completed: '#14b8a6',
    skipped: '#6b7280',
    cancelled: '#ef4444',
};

function StatusBadge({ status }: { status: SessionStatus }) {
    const { t } = useTranslation();
    const color = STATUS_COLORS[status];
    return (
        <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
            <JempText type="caption" color={color}>{t(`session_status.${status}`)}</JempText>
        </View>
    );
}

// ── Mode badge ────────────────────────────────────────────────────────────

const MODE_COLORS: Record<string, string> = {
    full: '#22c55e',
    reduced: '#f59e0b',
    activation: '#3b82f6',
    recovery: '#a78bfa',
};

function ModeBadge({ mode }: { mode: string | null | undefined }) {
    const { t } = useTranslation();
    if (!mode) return null;
    const color = MODE_COLORS[mode] ?? '#8c8c8c';
    return (
        <View style={[styles.modeBadge, { backgroundColor: `${color}33`, borderColor: `${color}55` }]}>
            <JempText type="caption" color={color}>{t(`session_mode.${mode}` as any)}</JempText>
        </View>
    );
}

// ── Session card ──────────────────────────────────────────────────────────

function SessionCard({ session, modeSlug, theme }: { session: WorkoutSession; modeSlug?: string | null; theme: any }) {
    const router = useRouter();
    const { t } = useTranslation();

    return (
        <View style={styles.sessionCard}>
            <Image
                source={getSessionImage(session.primary_exercise_slug, session.primary_image_group)}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                contentPosition="center"
            />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.92)']}
                locations={[0.3, 1]}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.modeBadgeCorner}>
                <ModeBadge mode={modeSlug} />
            </View>
            <View style={styles.cardContent}>
                <JempText type="hero" color="#fff">{session.name}</JempText>
                <View style={styles.metaRow}>
                    {session.estimated_duration_minutes ? (
                        <>
                            <Ionicons name="time-outline" size={13} color={Cyan[500]} />
                            <JempText type="caption" color="rgba(255,255,255,0.5)">
                                {session.estimated_duration_minutes} MIN
                            </JempText>
                        </>
                    ) : null}
                    <StatusBadge status={session.status} />
                </View>
                {session.status !== 'scheduled' && (
                    <Pressable
                        style={styles.cta}
                        onPress={() => router.push(
                            session.status === 'completed'
                                ? `/session-summary/${session.id}`
                                : `/session/${session.id}`
                        )}
                    >
                        <LinearGradient
                            colors={[Cyan[500], Electric[500]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.ctaGradient}
                        >
                            <JempText type="button" color="#fff">
                                {session.status === 'completed' ? t('ui.view_summary') : t('ui.view_details')}
                            </JempText>
                        </LinearGradient>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

// ── Plan template preview card (no real session yet) ─────────────────────

function PlanSessionCard({ planSession, nextSession, theme }: {
    planSession: PlanSession;
    nextSession: WorkoutSession | null;
    theme: any;
}) {
    const router = useRouter();
    const { t } = useTranslation();
    return (
        <View style={styles.sessionCard}>
            <Image
                source={getSessionImage(planSession.primary_exercise_slug, planSession.primary_image_group)}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                contentPosition="center"
            />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.92)']}
                locations={[0.3, 1]}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.modeBadgeCorner}>
                <ModeBadge mode={planSession.mode_slug} />
            </View>
            <View style={styles.cardContent}>
                <View style={[styles.previewBadge, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                    <JempText type="caption" color="rgba(255,255,255,0.55)">
                        {t('ui.plan_template_preview')}
                    </JempText>
                </View>
                <JempText type="hero" color="#fff">{planSession.name}</JempText>
                <View style={styles.metaRow}>
                    {planSession.estimated_duration_minutes ? (
                        <>
                            <Ionicons name="time-outline" size={13} color={GradientMid} />
                            <JempText type="caption" color="rgba(255,255,255,0.5)">
                                {planSession.estimated_duration_minutes} MIN
                            </JempText>
                        </>
                    ) : null}
                </View>
                {nextSession && (
                    <Pressable
                        style={styles.cta}
                        onPress={() => router.push(`/session/${nextSession.id}`)}
                    >
                        <LinearGradient
                            colors={[Cyan[500], Electric[500]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.ctaGradient}
                        >
                            <JempText type="button" color="#fff">{t('ui.view_details')}</JempText>
                        </LinearGradient>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

// ── Helper: Plan-Template für einen Tag ohne echte Session ────────────────

function getPreviewSession(
    day: Date,
    sessions: WorkoutSession[],
    planSessionByDow: Map<number, PlanSession>,
): PlanSession | null {
    const dateStr = toDateStr(day);
    const hasReal = sessions.some(s => toDateStr(new Date(s.scheduled_at!)) === dateStr);
    if (hasReal) return null;
    const jsDay = day.getDay(); // 0=So, 1=Mo, …, 6=Sa
    const dow = jsDay === 0 ? 7 : jsDay; // DB: 1=Mo, 7=So
    return planSessionByDow.get(dow) ?? null;
}

// ── Plan generation progress ──────────────────────────────────────────────

const STEPS = [
    { statusKey: 'fetching_data', i18nKey: 'planGeneration.fetching_data' },
    { statusKey: 'planning_week', i18nKey: 'planGeneration.planning_week' },
    { statusKey: 'generating_session', i18nKey: 'planGeneration.generating_session' },
    { statusKey: 'saving', i18nKey: 'planGeneration.saving' },
] as const;

function PlanGenerationProgress() {
    const { t } = useTranslation();
    const { job, isGenerating, isError } = usePlanGenerationStore();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    if (!job || (!isGenerating && !isError && job.status !== 'completed')) return null;

    const currentStepIndex = STEPS.findIndex(s => s.statusKey === job.status);

    return (
        <View style={[styles.progressContainer, { backgroundColor: theme.surface }]}>
            <JempText type="subtitle" style={{ marginBottom: 16 }}>
                {isError ? t('planGeneration.error_title') : t('planGeneration.title')}
            </JempText>

            {STEPS.map((step, index) => {
                const isDone = currentStepIndex > index || job.status === 'completed';
                const isActive = currentStepIndex === index && isGenerating;
                const label = step.statusKey === 'generating_session' && job.phase_detail && isActive
                    ? t('planGeneration.generating_session', {
                        current: parseInt(job.phase_detail.split('/')[0] ?? '0'),
                        total: parseInt(job.phase_detail.split('/')[1] ?? '0'),
                    })
                    : t(step.i18nKey as any);

                return (
                    <View key={step.statusKey} style={styles.progressStep}>
                        <View style={[
                            styles.progressDot,
                            isDone && { backgroundColor: Cyan[500] },
                            isActive && { backgroundColor: Electric[500] },
                            !isDone && !isActive && { backgroundColor: theme.textMuted },
                        ]}>
                            {isDone && <Ionicons name="checkmark" size={12} color="#fff" />}
                            {isActive && <ActivityIndicator size="small" color="#fff" />}
                        </View>
                        <JempText
                            type="body"
                            color={isActive ? theme.text : isDone ? Cyan[500] : theme.textMuted}
                        >
                            {label}
                        </JempText>
                    </View>
                );
            })}

            {isError && (
                <JempText type="caption" color="#ef4444" style={{ marginTop: 8 }}>
                    {job.error ?? t('planGeneration.error_generic')}
                </JempText>
            )}
        </View>
    );
}

// ── Screen ────────────────────────────────────────────────────────────────

export default function PlanScreen() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { plan, sessions, planSessions, isLoading, streak } = usePlan();
    const { profile } = useCurrentUser();

    const subscribe = usePlanGenerationStore(s => s.subscribe);
    const unsubscribe = usePlanGenerationStore(s => s.unsubscribe);

    useEffect(() => {
        if (profile?.id) {
            subscribe(profile.id);
            return () => unsubscribe();
        }
    }, [profile?.id]);

    const { mutate: updateSessionStatus } = useUpdateSessionStatus();
    const { mutate: rescheduleSession } = useRescheduleSession();

    const [managedSession, setManagedSession] = useState<WorkoutSession | null>(null);

    const { date } = useLocalSearchParams<{ date?: string }>();
    const [selectedDay, setSelectedDay] = useState<Date>(new Date());
    const appliedDate = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (date && date !== appliedDate.current) {
            appliedDate.current = date;
            setSelectedDay(new Date(date));
        }
    }, [date]);
    const [trackWidth, setTrackWidth] = useState(0);
    const barWidth = useSharedValue(0);

    const today = new Date();
    const weekDays = getWeekDays(today);
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

    // Plan completion: sessions that are no longer scheduled/in_progress
    const planCompletion = useMemo(() => sessions.length > 0
        ? sessions.filter(s => s.status !== 'scheduled' && s.status !== 'in_progress').length / sessions.length
        : 0, [sessions]);

    // Days in current week that have at least one session (real or plan-template preview)
    const weekSessionDays = useMemo(() => {
        const set = new Set(
            sessions
                .map(s => toDateStr(new Date(s.scheduled_at!)))
                .filter(dateStr => weekDays.some(wd => toDateStr(wd) === dateStr))
        );
        // Add plan-template previews for empty days (only if no WorkoutSession with same plan_session_id exists this week)
        for (const day of weekDays) {
            if (!set.has(toDateStr(day))) {
                const preview = getPreviewSession(day, sessions, planSessionByDow);
                if (preview && !sessions.some(s => s.workout_plan_session_id === preview.id)) {
                    set.add(toDateStr(day));
                }
            }
        }
        return set;
    }, [sessions, weekDays, planSessionByDow]);

    // Sessions for the tapped day
    const selectedDayStr = toDateStr(selectedDay);
    const selectedDaySessions = useMemo(() => sessions.filter(
        s => toDateStr(new Date(s.scheduled_at!)) === selectedDayStr
    ), [sessions, selectedDayStr]);

    // Plan-template preview for tapped day (only when no real session AND no WorkoutSession with same plan_session_id exists this week)
    const selectedDayPreview = useMemo(() => {
        const preview = getPreviewSession(selectedDay, sessions, planSessionByDow);
        if (!preview) return null;
        if (sessions.some(s => s.workout_plan_session_id === preview.id)) return null;
        return preview;
    }, [selectedDay, sessions, planSessionByDow]);

    // First upcoming concrete session for the preview template (for "View Details" navigation)
    const previewNextSession = useMemo(() => {
        if (!selectedDayPreview) return null;
        const todayStr = toDateStr(new Date());
        return sessions.find(s =>
            s.workout_plan_session_id === selectedDayPreview.id &&
            s.scheduled_at != null &&
            toDateStr(new Date(s.scheduled_at)) > todayStr
        ) ?? null;
    }, [selectedDayPreview, sessions]);

    // Day variant from weekly_schedule
    const selectedDayVariant = useMemo((): DayVariant => {
        const weeklySchedule = (profile as any)?.weekly_schedule;
        if (!weeklySchedule?.sessions?.length) return 'rest';
        const jsDay = selectedDay.getDay();
        const dow = jsDay === 0 ? 7 : jsDay;
        const sportSession = weeklySchedule.sessions.find((s: any) => s.day_of_week === dow);
        if (!sportSession) return 'rest';
        const COMBAT_SPORTS = new Set(['boxing', 'mma', 'wrestling', 'judo', 'bjj', 'kickboxing', 'karate', 'taekwondo']);
        const isCombat = COMBAT_SPORTS.has(profile?.sport?.slug ?? '');
        if (sportSession.type === 'tournament') return 'tournament';
        if (sportSession.type === 'game') return isCombat ? 'fight' : 'game';
        return 'training';
    }, [selectedDay, profile]);

    useEffect(() => {
        if (trackWidth > 0) {
            barWidth.value = withTiming(trackWidth * planCompletion, { duration: 700 });
        }
    }, [trackWidth, planCompletion]);

    const barStyle = useAnimatedStyle(() => ({ width: barWidth.value }));

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <PlanGenerationProgress />
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
                    <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
                        <Ionicons name="barbell-outline" size={32} color={theme.textMuted} />
                        <JempText type="body-l" color={theme.textMuted} style={styles.centeredText}>
                            {t('ui.no_active_plan')}
                        </JempText>
                    </View>
                ) : (
                    <>
                        {/* Stats card */}
                        <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <JempText type="h1" gradient>{Math.round(planCompletion * 100)}%</JempText>
                                    <JempText type="caption" color={theme.textMuted}>{t('ui.plan_complete').toUpperCase()}</JempText>
                                </View>
                                <View style={[styles.divider, { backgroundColor: theme.borderDivider }]} />
                                <View style={styles.statItem}>
                                    <View style={styles.statValueRow}>
                                        <Ionicons name="flame" size={18} color={Cyan[500]} />
                                        <JempText type="h1" gradient>{String(streak)}</JempText>
                                    </View>
                                    <JempText type="caption" color={theme.textMuted}>{t('ui.day_streak').toUpperCase()}</JempText>
                                </View>
                            </View>
                            <View
                                style={[styles.progressTrack, { backgroundColor: theme.borderDivider }]}
                                onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
                            >
                                <Animated.View style={[styles.progressFill, barStyle]}>
                                    <LinearGradient
                                        colors={[Cyan[500], Electric[500]]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                </Animated.View>
                            </View>
                        </View>

                        {/* Week strip */}
                        <View style={styles.weekStrip}>
                            {weekDays.map((day, i) => {
                                const isToday = i === todayIndex;
                                const isSelected = toDateStr(day) === selectedDayStr;
                                const hasSession = weekSessionDays.has(toDateStr(day));

                                return (
                                    <Pressable
                                        key={i}
                                        style={[
                                            styles.dayWrapper,
                                            {
                                                backgroundColor: isToday
                                                    ? 'transparent'
                                                    : isSelected
                                                        ? `${Electric[500]}28`
                                                        : theme.surface,
                                            },
                                        ]}
                                        onPress={() => setSelectedDay(new Date(day))}
                                    >
                                        {isToday && (
                                            <LinearGradient
                                                colors={[Cyan[500], Electric[500]]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 0, y: 1 }}
                                                style={StyleSheet.absoluteFill}
                                            />
                                        )}
                                        <JempText
                                            type="caption"
                                            style={styles.dayName}
                                            color={isToday ? 'rgba(255,255,255,0.7)' : theme.textMuted}
                                        >
                                            {DAY_NAMES[i]}
                                        </JempText>
                                        <JempText
                                            type="h2"
                                            style={styles.dayNumber}
                                            color={isToday ? '#fff' : theme.text}
                                        >
                                            {String(day.getDate())}
                                        </JempText>
                                        <View style={styles.dotSlot}>
                                            {isToday
                                                ? <JempText type="caption" style={styles.todayLabel} color="rgba(255,255,255,0.7)">{t('ui.today')}</JempText>
                                                : hasSession && <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                                            }
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {/* Sessions for selected day */}
                        {selectedDaySessions.length > 0 ? (
                            <>
                                <SessionCard
                                    key={selectedDaySessions[0].id}
                                    session={selectedDaySessions[0]}
                                    modeSlug={planSessionByDow.get(
                                        (() => { const js = selectedDay.getDay(); return js === 0 ? 7 : js; })()
                                    )?.mode_slug}
                                    theme={theme}
                                />
                                {selectedDaySessions[0].status === 'scheduled' && (
                                    <View style={styles.sessionActionRow}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: theme.surface }]}
                                            onPress={() => { setManagedSession(selectedDaySessions[0]); router.push({ pathname: '/session-manage', params: { sessionId: selectedDaySessions[0].id } }); }}
                                        >
                                            <JempText type="button" color={theme.text}>{t('ui.session_manage_title')}</JempText>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.actionBtnGradient}
                                            onPress={() => router.push(`/session/${selectedDaySessions[0].id}`)}
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
                        ) : selectedDayPreview ? (
                            <PlanSessionCard key={selectedDayPreview.id} planSession={selectedDayPreview} nextSession={previewNextSession} theme={theme} />
                        ) : (
                            <RestDayCard variant={selectedDayVariant} />
                        )}
                    </>
                )}
            </View>

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

    centered: { paddingTop: 60, alignItems: 'center' },
    centeredText: { textAlign: 'center' },
    emptyCard: { borderRadius: 16, padding: 32, alignItems: 'center', gap: 12 },

    // Stats
    statsCard: { borderRadius: 16, padding: 16, gap: 14 },
    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    statItem: { flex: 1, gap: 2 },
    statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    divider: { width: 1, height: 40 },
    progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3, overflow: 'hidden' },

    // Week strip
    weekStrip: { flexDirection: 'row', gap: 4 },
    dayWrapper: {
        flex: 1, borderRadius: 10, paddingVertical: 7,
        alignItems: 'center', overflow: 'hidden', gap: 2,
    },
    dayName: { fontSize: 9, lineHeight: 12, letterSpacing: 0.5 },
    dayNumber: { fontSize: 15, lineHeight: 18 },
    todayLabel: { fontSize: 7, lineHeight: 10, letterSpacing: 0.5 },
    dotSlot: { height: 10, alignItems: 'center', justifyContent: 'center' },
    dot: { width: 5, height: 5, borderRadius: 3 },

    // Sessions
    // sessionList: { gap: 16, height: "100%" },
    sessionCard: { position: "relative", borderRadius: 20, overflow: 'hidden', flex: 1 },
    cardContent: { position: 'absolute', bottom: 20, left: 20, right: 20, gap: 8 },
    sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cta: { borderRadius: 100, overflow: 'hidden', marginTop: 4 },
    ctaGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },

    // Rest
    restCard: { borderRadius: 16, alignItems: 'center', gap: 8, flex: 1, justifyContent: "center" },

    // Mode badge (top-right corner of card)
    modeBadgeCorner: {
        position: 'absolute',
        top: 14,
        right: 14,
        zIndex: 1,
    },
    modeBadge: {
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },

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

    // Plan template preview badge
    previewBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 6,
        marginBottom: 2,
    },

    // Plan generation progress
    progressContainer: { padding: 20, borderRadius: 16, margin: 16, gap: 8 },
    progressStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    progressDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
