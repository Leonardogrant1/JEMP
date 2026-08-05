import { JempText } from '../jemp-text';
import { CategoryChip, ModeChip, SessionChip } from '../plan/SessionChip';
import { getSessionImage } from '@/constants/session-images';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { getSessionModeSlug } from '@/helpers/session-helpers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useUpdateSessionStatus } from '@/mutations/use-update-session-status';
import { usePlan, WorkoutSession } from '@/providers/plan-provider';
import { useSessionThumbnailsQuery } from '@/queries/use-session-thumbnails-query';
import { useSuperwallFunctions } from '@/services/purchases/superwall/useSuperwall';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, { FadeInDown, FadeOut } from 'react-native-reanimated';

// Hero-Karte und CTA sind getrennte Komponenten, damit der SessionPager die
// Karten swipen kann, während der CTA fix bleibt und sich an die aktive
// Session bindet (gleiches Muster wie im Plan-Tab)

export function TodaysSessionHero({ session }: { session: WorkoutSession }) {
    const router = useRouter();
    const { t } = useTranslation();
    const { planSessions } = usePlan();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { data: remoteThumbnails } = useSessionThumbnailsQuery();

    const modeSlug = useMemo(() => {
        return getSessionModeSlug(session, planSessions);
    }, [session, planSessions]);

    return (
        // Glow-Wrapper wie bei der SessionCard in plan.tsx — overflow:'hidden'
        // auf der Karte clippt iOS-Schatten, daher liegt er außen
        <View style={styles.cardGlow}>
            <Pressable
                style={styles.card}
                onPress={() => {
                    if (session.status === 'completed') {
                        router.push(`/session-summary/${session.id}`);
                    }
                }}
                disabled={session.status !== 'completed'}
            >
                <Image
                    source={getSessionImage(session.primary_exercise_slug, session.primary_image_group, remoteThumbnails)}
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
                    <JempText type="caption" gradient={session.status === 'completed'} color={session.status !== 'completed' ? theme.textMuted : ''}>
                        {session.status === 'completed'
                            ? t('ui.session_completed')
                            : session.status === 'in_progress'
                                ? t('ui.current_session')
                                : t('ui.next_session')}
                    </JempText>
                    <JempText type="hero" color="#fff">{session.name}</JempText>
                    <View style={styles.metaRow}>
                        {session.estimated_duration_minutes ? (
                            <SessionChip
                                icon={<Ionicons name="time-outline" size={12} color={GradientMid} />}
                                label={`${session.estimated_duration_minutes} ${t('ui.min')}`}
                            />
                        ) : null}
                        <ModeChip mode={modeSlug} />
                        {(session.focus_categories ?? []).map(slug => (
                            <CategoryChip key={slug} slug={slug} />
                        ))}
                    </View>
                    {session.status === 'completed' && (
                        <View style={styles.completedBadge}>
                            <Ionicons name="checkmark-circle" size={16} color={GradientMid} />
                            <JempText type="body-sm" color={GradientMid}>
                                {t('ui.well_done')}
                            </JempText>
                        </View>
                    )}
                </View>
            </Pressable>
        </View>
    );
}

export function TodaysSessionCta({ session }: { session: WorkoutSession }) {
    const router = useRouter();
    const { t } = useTranslation();
    const { openWithPlacement } = useSuperwallFunctions();
    const updateStatus = useUpdateSessionStatus();
    const { sessions } = usePlan();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    // Solange eine andere Session läuft, kann diese nicht gestartet werden —
    // der Button ist gedimmt und ein Tap zeigt einen kurzen Hinweis
    const blockedByActiveSession =
        session.status === 'scheduled' && sessions.some((s) => s.status === 'in_progress');

    const [showHint, setShowHint] = useState(false);
    const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => {
        if (hintTimer.current) clearTimeout(hintTimer.current);
    }, []);

    function handleBlockedPress() {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setShowHint(true);
        if (hintTimer.current) clearTimeout(hintTimer.current);
        hintTimer.current = setTimeout(() => setShowHint(false), 2500);
    }

    const handleStartSession = useCallback(() => {
        openWithPlacement('start_session', () => {
            if (session.status === 'in_progress') {
                trackerManager.track('session_continued', { session_id: session.id });
                router.push(`/active-session/${session.id}`);
            } else {
                updateStatus.mutate(
                    { sessionId: session.id, status: 'in_progress' },
                    {
                        onSuccess: () => {
                            trackerManager.track('session_started', { session_id: session.id });
                            router.push(`/active-session/${session.id}`);
                        },
                    },
                );
            }
        });
    }, [session, updateStatus, router, openWithPlacement]);

    // Abgeschlossene Session: CTA führt zur Zusammenfassung
    if (session.status === 'completed') {
        return (
            <Pressable style={styles.cta} onPress={() => router.push(`/session-summary/${session.id}`)}>
                <LinearGradient
                    colors={[Cyan[500], Electric[500]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaGradient}
                >
                    <JempText type="button" color="#fff">
                        {t('ui.view_summary')}
                    </JempText>
                </LinearGradient>
            </Pressable>
        );
    }

    return (
        <View>
            {showHint && (
                <Reanimated.View
                    entering={FadeInDown.duration(180)}
                    exiting={FadeOut.duration(150)}
                    style={styles.hintWrapper}
                    pointerEvents="none"
                >
                    <View style={[styles.hintBubble, { backgroundColor: theme.surface, borderColor: theme.borderDivider }]}>
                        <JempText type="caption" color={theme.text} style={styles.hintText}>
                            {t('ui.finish_active_session_first')}
                        </JempText>
                    </View>
                </Reanimated.View>
            )}
            <Pressable
                style={[styles.cta, blockedByActiveSession && styles.ctaBlocked]}
                onPress={blockedByActiveSession ? handleBlockedPress : handleStartSession}
            >
                <LinearGradient
                    colors={[Cyan[500], Electric[500]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaGradient}
                >
                    <JempText type="button" color="#fff">
                        {session.status === 'in_progress' ? t('ui.continue_session') : t('ui.start_session')}
                    </JempText>
                </LinearGradient>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    cardGlow: {
        flex: 1,
        borderRadius: 20,
        shadowColor: GradientMid,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
        elevation: 8,
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
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
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
    ctaBlocked: {
        opacity: 0.45,
    },
    ctaGradient: {
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hintWrapper: {
        position: 'absolute',
        bottom: 64,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1,
    },
    hintBubble: {
        borderRadius: 12,
        borderWidth: 1,
        paddingVertical: 8,
        paddingHorizontal: 14,
        maxWidth: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    hintText: {
        textAlign: 'center',
    },
});
