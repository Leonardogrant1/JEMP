import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { usePlan, WorkoutSession } from '@/providers/plan-provider';
import { Ionicons } from '@expo/vector-icons';
import { RestDayCard } from '@/components/rest-day-card';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useUpdateSessionStatus } from '@/mutations/use-update-session-status';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SESSION_IMAGE = require('@/assets/images/splash-icon.png');

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

export default function HomeScreen() {
    const { profile } = useCurrentUser();
    const { sessions } = usePlan();
    const router = useRouter();
    const { t } = useTranslation();
    const updateStatus = useUpdateSessionStatus();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const nextSession = useMemo(() => getTodaySession(sessions), [sessions]);

    const handleStartSession = useCallback(() => {
        if (!nextSession) return;
        if (nextSession.status === 'in_progress') {
            router.push(`/active-session/${nextSession.id}`);
        } else {
            updateStatus.mutate(
                { sessionId: nextSession.id, status: 'in_progress' },
                { onSuccess: () => router.push(`/active-session/${nextSession.id}`) },
            );
        }
    }, [nextSession, updateStatus, router]);

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={styles.content}>

                {/* ── Header ── */}
                <View style={styles.header}>
                    <View>
                        <JempText type="body-sm" color={theme.textMuted}>{t('ui.welcome_back')}</JempText>
                        <JempText type="h1">{profile?.first_name}</JempText>
                    </View>
                    <View style={[styles.avatar, { backgroundColor: theme.surface, borderColor: theme.borderCard }]}>
                        <JempText type="button" color={theme.text}>{profile?.first_name?.charAt(0)}</JempText>
                    </View>
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
                                source={SESSION_IMAGE}
                                style={StyleSheet.absoluteFill}
                                contentFit="cover"
                                contentPosition="top center"
                            />
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.9)']}
                                locations={[0.35, 1]}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={styles.cardContent}>
                                <JempText type="caption" color={nextSession.status === 'completed' ? Cyan[500] : theme.textMuted}>
                                    {nextSession.status === 'completed'
                                        ? t('ui.session_completed')
                                        : nextSession.status === 'in_progress'
                                            ? t('ui.current_session')
                                            : t('ui.next_session')}
                                </JempText>
                                <JempText type="hero" color="#fff">{nextSession.name}</JempText>
                                {nextSession.status === 'completed' ? (
                                    <View style={styles.completedBadge}>
                                        <Ionicons name="checkmark-circle" size={16} color={Cyan[500]} />
                                        <JempText type="body-sm" color={Cyan[500]}>
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
                    <RestDayCard />
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
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
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
