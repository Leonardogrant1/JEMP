
import { Colors, Cyan, Electric } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { usePlan } from "@/providers/plan-provider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { JempText } from "../jemp-text";



export function StatsCard() {
    const { t } = useTranslation();

    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { sessions, streak } = usePlan();


    const [trackWidth, setTrackWidth] = useState(0);
    const barWidth = useSharedValue(0);

    // Plan completion: sessions that are no longer scheduled/in_progress
    const planCompletion = useMemo(() => sessions.length > 0
        ? sessions.filter(s => s.status !== 'scheduled' && s.status !== 'in_progress').length / sessions.length
        : 0, [sessions]);

    useEffect(() => {
        if (trackWidth > 0) {
            barWidth.value = withTiming(trackWidth * planCompletion, { duration: 700 });
        }
    }, [trackWidth, planCompletion]);


    const barStyle = useAnimatedStyle(() => ({ width: barWidth.value }));

    return (
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
        </View>);
}

const styles = StyleSheet.create({
    // Stats
    statsCard: { borderRadius: 16, padding: 16, gap: 14 },
    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    statItem: { flex: 1, gap: 2 },
    statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    divider: { width: 1, height: 40 },
    progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3, overflow: 'hidden' },
})