import { JempText } from '@/components/jemp-text';
import { RestDayCard, DayVariant } from '@/components/rest-day-card';
import { getSessionImage } from '@/constants/session-images';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useUpdateSessionStatus } from '@/mutations/use-update-session-status';
import { useCurrentUser } from '@/providers/current-user-provider';
import { usePlan, WorkoutSession, PlanSession } from '@/providers/plan-provider';
import { useSuperwallFunctions } from '@/services/purchases/superwall/useSuperwall';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function getNextScheduledSession(sessions: WorkoutSession[]): WorkoutSession | null {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    return sessions
        .filter(s => s.status === 'scheduled' && s.scheduled_at != null && new Date(s.scheduled_at) >= tomorrowStart)
        .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0] ?? null;
}

function getTodaySession(sessions: WorkoutSession[]) {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const isToday = (s: WorkoutSession) => {
        const d = new Date(s.scheduled_at!);
        return d >= todayStart && d < tomorrowStart;
    };

    // Priority: in_progress > completed today > scheduled today
    const inProgress = sessions.find(s => s.status === 'in_progress');
    if (inProgress) return inProgress;

    const completedToday = sessions.find(s => s.status === 'completed' && isToday(s));
    if (completedToday) return completedToday;

    const scheduledToday = sessions.find(s => s.status === 'scheduled' && isToday(s));
    return scheduledToday ?? null;
}

const MODE_COLORS: Record<string, string> = {
    full:       '#22c55e',
    reduced:    '#f59e0b',
    activation: '#3b82f6',
    recovery:   '#a78bfa',
};

function ModeBadge({ mode }: { mode: string | null | undefined }) {
    const { t } = useTranslation();
    if (!mode) return null;
    const color = MODE_COLORS[mode] ?? '#8c8c8c';
    return (
        <View style={[modeBadgeStyle.badge, { backgroundColor: `${color}33`, borderColor: `${color}55` }]}>
            <JempText type="caption" color={color}>{t(`session_mode.${mode}` as any)}</JempText>
        </View>
    );
}

const modeBadgeStyle = StyleSheet.create({
    badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
});

export default function HomeScreen() {
    const { profile } = useCurrentUser();
    const { sessions, planSessions } = usePlan();
    const router = useRouter();
    const { t } = useTranslation();
    const updateStatus = useUpdateSessionStatus();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const nextSession = useMemo(() => getTodaySession(sessions), [sessions]);
    const nextScheduledSession = useMemo(
        () => (nextSession ? null : getNextScheduledSession(sessions)),
        [nextSession, sessions],
    );

    const todayModeSlug = useMemo(() => {
        if (!nextSession?.workout_plan_session_id) return null;
        return planSessions.find(ps => ps.id === nextSession.workout_plan_session_id)?.mode_slug ?? null;
    }, [nextSession, planSessions]);

    const todayVariant = useMemo((): DayVariant => {
        const weeklySchedule = (profile as any)?.weekly_schedule;
        if (!weeklySchedule?.sessions?.length) return 'rest';
        const jsDay = new Date().getDay();
        const dow = jsDay === 0 ? 7 : jsDay;
        const sportSession = weeklySchedule.sessions.find((s: any) => s.day_of_week === dow);
        if (!sportSession) return 'rest';
        const COMBAT_SPORTS = new Set(['boxing', 'mma', 'wrestling', 'judo', 'bjj', 'kickboxing', 'karate', 'taekwondo']);
        const isCombat = COMBAT_SPORTS.has(profile?.sport?.slug ?? '');
        if (sportSession.type === 'tournament') return 'tournament';
        if (sportSession.type === 'game') return isCombat ? 'fight' : 'game';
        return 'training';
    }, [profile]);

    const { openWithPlacement } = useSuperwallFunctions();

    const handleStartSession = useCallback(() => {
        if (!nextSession) return;
        openWithPlacement('start_session', () => {
            if (nextSession.status === 'in_progress') {
                trackerManager.track('session_continued', { session_id: nextSession.id });
                router.push(`/active-session/${nextSession.id}`);
            } else {
                updateStatus.mutate(
                    { sessionId: nextSession.id, status: 'in_progress' },
                    {
                        onSuccess: () => {
                            trackerManager.track('session_started', { session_id: nextSession.id });
                            router.push(`/active-session/${nextSession.id}`);
                        },
                    },
                );
            }
        });
    }, [nextSession, updateStatus, router, openWithPlacement]);


    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={styles.content}>

                {/* ── Header ── */}
                <View style={styles.header}>
                    <View>
                        <JempText type="body-sm" color={theme.textMuted}>{t('ui.welcome_back')}</JempText>
                        <JempText type="h1">{profile?.first_name}</JempText>
                    </View>
                    <LinearGradient
                        colors={[Cyan[500], Electric[500]]}
                        start={{ x: 0, y: 1 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.avatarRing}
                    >
                        <View style={[styles.avatarInner, { backgroundColor: theme.surface }]}>
                            <JempText type="button" color={theme.text}>
                                {[profile?.first_name, profile?.last_name].filter(Boolean).map(n => n![0].toUpperCase()).join('')}
                            </JempText>
                        </View>
                    </LinearGradient>
                </View>

                {nextSession ? (
                    <>
                        {/* ── Session Card ── */}
                        <Pressable
                            style={styles.card}
                            onPress={() => {
                                if (nextSession.status === 'completed') {
                                    router.push(`/session-summary/${nextSession.id}`);
                                }
                            }}
                            disabled={nextSession.status !== 'completed'}
                        >
                            <Image
                                source={getSessionImage(nextSession.primary_exercise_slug)}
                                style={StyleSheet.absoluteFill}
                                contentFit="cover"
                                contentPosition="top center"
                            />
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.9)']}
                                locations={[0.35, 1]}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={styles.modeBadgeCorner}>
                            <ModeBadge mode={todayModeSlug} />
                        </View>
                        <View style={styles.cardContent}>
                                <JempText type="caption" gradient={nextSession.status == 'completed'} color={nextSession.status !== 'completed' ? theme.textMuted : ''}>
                                    {nextSession.status === 'completed'
                                        ? t('ui.session_completed')
                                        : nextSession.status === 'in_progress'
                                            ? t('ui.current_session')
                                            : t('ui.next_session')}
                                </JempText>
                                <JempText type="hero" color="#fff">{nextSession.name}</JempText>
                                {nextSession.status === 'completed' ? (
                                    <View style={styles.completedBadge}>
                                        <Ionicons name="checkmark-circle" size={16} color={GradientMid} />
                                        <JempText type="body-sm" color={GradientMid}>
                                            {t('ui.well_done')}
                                        </JempText>
                                    </View>
                                ) : nextSession.estimated_duration_minutes ? (
                                    <JempText type="body-sm" color={theme.textMuted}>
                                        {nextSession.estimated_duration_minutes} {t('ui.min')}
                                    </JempText>
                                ) : null}
                            </View>
                        </Pressable>

                        {/* ── CTA ── */}
                        {nextSession.status !== 'completed' && (
                            <Pressable style={styles.cta} onPress={handleStartSession}>
                                <LinearGradient
                                    colors={[Cyan[500], Electric[500]]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.ctaGradient}
                                >
                                    <JempText type="button" color="#fff">
                                        {nextSession.status === 'in_progress' ? t('ui.continue_session') : t('ui.start_session')}
                                    </JempText>
                                </LinearGradient>
                            </Pressable>
                        )}
                    </>
                ) : (
                    <RestDayCard
                        variant={todayVariant}
                        nextSessionDate={nextScheduledSession ? new Date(nextScheduledSession.scheduled_at!) : undefined}
                        onViewInPlan={nextScheduledSession ? () => {
                            const dateStr = new Date(nextScheduledSession.scheduled_at!).toISOString().split('T')[0];
                            router.push(`/(tabs)/plan?date=${dateStr}`);
                        } : undefined}
                    />
                )}

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
        gap: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    avatarRing: {
        width: 44,
        height: 44,
        borderRadius: 22,
        padding: 2,
    },
    avatarInner: {
        flex: 1,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
    },
    cardContent: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        gap: 4,
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    modeBadgeCorner: {
        position: 'absolute',
        top: 14,
        right: 14,
        zIndex: 1,
    },
    cta: {
        borderRadius: 100,
        overflow: 'hidden',
    },
    ctaGradient: {
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
