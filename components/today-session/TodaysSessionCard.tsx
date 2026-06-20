import { JempText } from '../jemp-text';
import { ModeBadge } from '../plan/ModeBadge';
import { getSessionImage } from '@/constants/session-images';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { getSessionModeSlug } from '@/helpers/session-helpers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useUpdateSessionStatus } from '@/mutations/use-update-session-status';
import { usePlan, WorkoutSession } from '@/providers/plan-provider';
import { useSuperwallFunctions } from '@/services/purchases/superwall/useSuperwall';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

interface TodaysSessionCardProps {
    nextSession: WorkoutSession;
}

export function TodaysSessionCard({ nextSession }: TodaysSessionCardProps) {
    const router = useRouter();
    const { t } = useTranslation();
    const { openWithPlacement } = useSuperwallFunctions();
    const updateStatus = useUpdateSessionStatus();
    const { planSessions } = usePlan();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const todayModeSlug = useMemo(() => {
        return getSessionModeSlug(nextSession, planSessions);
    }, [nextSession, planSessions]);

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
        <View style={styles.container}>
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
                    source={getSessionImage(nextSession.primary_exercise_slug, nextSession.primary_image_group)}
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        gap: 20,
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
        gap: 8,
    },
    modeBadgeCorner: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 1,
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
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
