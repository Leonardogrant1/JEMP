import { CHART_HEIGHT } from "@/constants/progress-constants";
import { Colors, Cyan, GRADIENT } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCountUp } from "@/hooks/use-count-up";
import { CategoryHistoryPoint } from "@/queries/use-user-category-history-query";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import { JempText } from "../jemp-text";
import { TrajectoryChart } from "./trajectory-chart";

interface ProgressHeroCardProps {
    label: string;
    score: number | null;
    trend: number | null;
    chartData: CategoryHistoryPoint[];
    emptyLabel: string;
    ctaLabel?: string;
    onCtaPress?: () => void; // shown inside the empty state instead of the chart
}

export function ProgressHeroCard({ label, score, trend, chartData, emptyLabel, ctaLabel, onCtaPress }: ProgressHeroCardProps) {
    const colorScheme = useColorScheme();
    const isDark = (colorScheme ?? 'dark') === 'dark';
    const theme = Colors[isDark ? 'dark' : 'light'];

    const glassOverlay = isDark ? 'rgba(18, 20, 26, 0.55)' : 'rgba(255, 255, 255, 0.55)';
    const borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const trendUp = trend !== null && trend >= 0;
    const trendColor = trendUp ? Cyan[400] : '#ef4444';
    const trendPillBg = trendUp ? 'rgba(61, 158, 203, 0.18)' : 'rgba(239, 68, 68, 0.15)';
    const displayScore = useCountUp(score);

    return (
        <View style={[styles.card, { borderColor }]}>
            <BlurView
                intensity={40}
                tint={isDark ? 'dark' : 'light'}
                style={[styles.glassFill, { backgroundColor: glassOverlay }]}
            />
            <View style={styles.header}>
                <JempText type="caption" color={theme.textMuted} style={styles.label}>
                    {label}
                </JempText>

                <View style={styles.scoreRow}>
                    <JempText type="h1" style={styles.score}>
                        {displayScore !== null ? String(displayScore) : '—'}
                    </JempText>
                    {trend !== null && (
                        <View style={[styles.trendPill, { backgroundColor: trendPillBg }]}>
                            <Ionicons
                                name={trendUp ? 'trending-up' : 'trending-down'}
                                size={13}
                                color={trendColor}
                            />
                            <JempText type="caption" color={trendColor} style={styles.trendText}>
                                {trendUp ? '+' : ''}{trend}
                            </JempText>
                        </View>
                    )}
                </View>
            </View>

            {chartData.length < 1 && onCtaPress ? (
                <View style={styles.emptyWrap}>
                    <JempText type="caption" color={theme.textMuted}>{emptyLabel}</JempText>
                    <Pressable onPress={onCtaPress} style={styles.ctaWrap}>
                        <LinearGradient
                            colors={GRADIENT}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.cta}
                        >
                            <JempText type="button" color="#fff">{ctaLabel}</JempText>
                            <Ionicons name="arrow-forward" size={16} color="#fff" />
                        </LinearGradient>
                    </Pressable>
                </View>
            ) : (
                <TrajectoryChart data={chartData} emptyLabel={emptyLabel} />
            )}
        </View>
    );
}


const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        borderWidth: 1,
        paddingBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 2,
    },
    glassFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 20,
        overflow: 'hidden',
    },
    label: {
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 4,
    },
    score: {
        fontSize: 40,
        lineHeight: 46,
        letterSpacing: -1.5,
    },
    trendPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 100,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    trendText: { fontWeight: '600' },
    emptyWrap: {
        height: CHART_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        paddingHorizontal: 16,
    },
    ctaWrap: { borderRadius: 100, overflow: 'hidden' },
    cta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
});
