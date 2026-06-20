import { getSessionImage } from "@/constants/session-images";
import { Cyan, Electric } from "@/constants/theme";
import { getSessionModeSlug } from "@/helpers/session-helpers";
import { usePlan, WorkoutSession } from "@/providers/plan-provider";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { JempText } from "../jemp-text";
import { ModeBadge } from "./ModeBadge";
import { StatusBadge } from "./StatusBadge";

export function SessionCard({ session, modeSlug: propModeSlug, theme }: { session: WorkoutSession; modeSlug?: string | null; theme: any }) {
    const router = useRouter();
    const { t } = useTranslation();
    const { planSessions } = usePlan();

    const modeSlug = propModeSlug !== undefined ? propModeSlug : getSessionModeSlug(session, planSessions);

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

const styles = StyleSheet.create({


    // Sessions
    // sessionList: { gap: 16, height: "100%" },
    sessionCard: { position: "relative", borderRadius: 20, overflow: 'hidden', flex: 1 },
    cardContent: { position: 'absolute', bottom: 20, left: 20, right: 20, gap: 8 },
    sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cta: { borderRadius: 100, overflow: 'hidden', marginTop: 4 },
    ctaGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },

    // Mode badge (top-right corner of card)
    modeBadgeCorner: {
        position: 'absolute',
        top: 14,
        right: 14,
        zIndex: 1,
    },


});