import { getSessionImage } from "@/constants/session-images";
import { Cyan, Electric, GradientMid } from "@/constants/theme";
import { getSessionModeSlug } from "@/helpers/session-helpers";
import { useSessionThumbnailsQuery } from "@/queries/use-session-thumbnails-query";
import { usePlan, WorkoutSession } from "@/providers/plan-provider";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { JempText } from "../jemp-text";
import { CategoryChip, ModeChip, SessionChip } from "./SessionChip";
import { StatusBadge } from "./StatusBadge";

export function SessionCard({ session, modeSlug: propModeSlug, theme }: { session: WorkoutSession; modeSlug?: string | null; theme: any }) {
    const router = useRouter();
    const { t } = useTranslation();
    const { planSessions } = usePlan();

    const modeSlug = propModeSlug !== undefined ? propModeSlug : getSessionModeSlug(session, planSessions);
    const { data: remoteThumbnails } = useSessionThumbnailsQuery();

    return (
        // Glow-Wrapper: overflow:'hidden' auf der Karte clippt iOS-Schatten,
        // daher liegt der Schatten auf einem äußeren View
        <View style={styles.cardGlow}>
        <View style={styles.sessionCard}>
            <Image
                source={getSessionImage(session.primary_exercise_slug, session.primary_image_group, remoteThumbnails)}
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
                <JempText type="h1" color="#fff">{session.name}</JempText>
                <View style={styles.metaRow}>
                    {session.estimated_duration_minutes ? (
                        <SessionChip
                            icon={<Ionicons name="time-outline" size={12} color={GradientMid} />}
                            label={`${session.estimated_duration_minutes} min`}
                        />
                    ) : null}
                    <ModeChip mode={modeSlug} />
                    {(session.focus_categories ?? []).map(slug => (
                        <CategoryChip key={slug} slug={slug} />
                    ))}
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
        </View>
    );
}

const styles = StyleSheet.create({


    // Sessions
    // sessionList: { gap: 16, height: "100%" },
    cardGlow: {
        flex: 1,
        borderRadius: 20,
        shadowColor: GradientMid,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
        elevation: 8,
    },
    sessionCard: { position: "relative", borderRadius: 20, overflow: 'hidden', flex: 1 },
    cardContent: { position: 'absolute', bottom: 20, left: 20, right: 20, gap: 8 },
    sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
    cta: { borderRadius: 100, overflow: 'hidden', marginTop: 4 },
    ctaGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
});