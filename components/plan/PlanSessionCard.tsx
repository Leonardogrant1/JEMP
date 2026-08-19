import { getSessionImage } from "@/constants/session-images";
import { Cyan, Electric, GradientMid } from "@/constants/theme";
import { toDateStr } from "@/helpers/date-helpers";
import { useSessionThumbnailsQuery } from "@/queries/use-session-thumbnails-query";
import { PlanSession, usePlan, WorkoutSession } from "@/providers/plan-provider";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { JempText } from "../jemp-text";
import { CategoryChip, ModeChip, SessionChip } from "./SessionChip";



export function PlanSessionCard({ planSession, nextSession: propNextSession, theme }: {
    planSession: PlanSession;
    nextSession?: WorkoutSession | null;
    theme: any;
}) {
    const router = useRouter();
    const { t } = useTranslation();
    const { sessions } = usePlan();
    const { data: remoteThumbnails } = useSessionThumbnailsQuery();

    const computedNextSession = useMemo(() => {
        const todayStr = toDateStr(new Date());
        return sessions.find(s =>
            s.workout_plan_session_id === planSession.id &&
            s.scheduled_at != null &&
            toDateStr(new Date(s.scheduled_at)) > todayStr
        ) ?? null;
    }, [planSession.id, sessions]);
    const nextSession = propNextSession !== undefined ? propNextSession : computedNextSession;

    return (
        // Glow-Wrapper: overflow:'hidden' auf der Karte clippt iOS-Schatten,
        // daher liegt der Schatten auf einem äußeren View
        <View style={styles.cardGlow}>
        <View style={styles.sessionCard}>
            <Image
                source={getSessionImage(planSession.primary_exercise_slug, planSession.primary_image_group, remoteThumbnails)}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                contentPosition="center"
            />
            <LinearGradient
                colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.95)']}
                locations={[0.15, 1]}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.cardContent}>
                <View style={[styles.previewBadge, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                    <JempText type="caption" color="rgba(255,255,255,0.55)">
                        {t('ui.plan_template_preview')}
                    </JempText>
                </View>
                <JempText type="h1" color="#fff">{planSession.name}</JempText>
                <View style={styles.metaRow}>
                    {planSession.estimated_duration_minutes ? (
                        <SessionChip
                            icon={<Ionicons name="time-outline" size={12} color={GradientMid} />}
                            label={`${planSession.estimated_duration_minutes} min`}
                        />
                    ) : null}
                    <ModeChip mode={planSession.mode_slug} />
                    {(planSession.focus_categories ?? []).map(slug => (
                        <CategoryChip key={slug} slug={slug} />
                    ))}
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
        </View>
    );
}


const styles = StyleSheet.create({
    cardGlow: {
        flex: 1,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: GradientMid,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
        elevation: 8,
    },
    sessionCard: {
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        flex: 1,
    },
    cardContent: {
        padding: 16,
        paddingTop: 80,
        position: 'relative',
        zIndex: 2,
        flex: 1,
        justifyContent: 'flex-end',
    },
    previewBadge: {
        position: 'absolute',
        top: -32,
        right: 16,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.24)',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 6,
    },
    cta: {
        marginTop: 12,
        borderRadius: 999,
        overflow: 'hidden',
    },
    ctaGradient: {
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});