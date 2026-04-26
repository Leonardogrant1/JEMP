import { CATEGORY_ICONS, GAUGE_CX, GAUGE_CY, GAUGE_R, GAUGE_SIZE, GAUGE_START, GAUGE_STROKE, GAUGE_SWEEP, STAT_LABELS } from "@/constants/progress-constants";
import { Colors } from "@/constants/theme";
import { gaugeColor, svgArcPath } from "@/helpers/progress-helpers";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { JempText } from "../jemp-text";
import { TrendBadge } from "./trend-badge";


export function GaugeCard({ slug, value, trend, style }: { slug: string; value: number | undefined; trend: number | null; style?: object }) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const score = value ?? 0;
    const fillSweep = Math.max(0, (score / 100) * GAUGE_SWEEP);
    const color = value !== undefined ? gaugeColor(score) : theme.textMuted;
    const icon = CATEGORY_ICONS[slug] ?? 'fitness';
    const label = STAT_LABELS[slug] ?? slug;

    const bgPath = svgArcPath(GAUGE_CX, GAUGE_CY, GAUGE_R, GAUGE_START, GAUGE_START + GAUGE_SWEEP);
    const fillPath = value !== undefined && score > 0
        ? svgArcPath(GAUGE_CX, GAUGE_CY, GAUGE_R, GAUGE_START, GAUGE_START + fillSweep)
        : null;

    return (
        <View style={[styles.gaugeCard, { backgroundColor: theme.surface }, style]}>
            <View style={styles.statCardHeader}>
                <View style={styles.statHeader}>
                    <Ionicons name={icon} size={12} color={theme.textMuted} />
                    <JempText type="caption" color={theme.textMuted} style={styles.statLabel}>{label}</JempText>
                </View>
                {trend !== null && <TrendBadge trend={trend} />}
            </View>
            <View style={styles.gaugeCardCircle}>
                <Svg width={GAUGE_SIZE} height={GAUGE_SIZE}>
                    <Path d={bgPath} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={GAUGE_STROKE} strokeLinecap="round" />
                    {fillPath && (
                        <Path d={fillPath} fill="none" stroke={color} strokeWidth={GAUGE_STROKE} strokeLinecap="round" />
                    )}
                </Svg>
                <View style={[StyleSheet.absoluteFill, styles.gaugeCenter]}>
                    <JempText type="h1" color={color} style={styles.gaugeCardScore}>
                        {value !== undefined ? String(score) : '—'}
                    </JempText>
                </View>
            </View>
        </View>
    );
}


const styles = StyleSheet.create({

    // Gauge grid card
    gaugeCard: {
        width: '48.25%',
        borderRadius: 16,
        padding: 14,
        paddingBottom: 14,
        gap: 0,
        overflow: 'hidden',
    },
    gaugeCardCircle: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 8,
        paddingBottom: 4,
    },
    gaugeCenter: { alignItems: 'center', justifyContent: 'center' },
    gaugeCardScore: { fontSize: 24, lineHeight: 28, fontWeight: '700', letterSpacing: -0.5 },
    miniGaugeScore: { fontSize: 12, fontWeight: '700', letterSpacing: -0.3 },

    overallCard: {
        borderRadius: 16,
        padding: 14,
        gap: 8,
        overflow: 'hidden',
    },
    overallCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    overallGaugeWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    overallScore: { fontSize: 40, lineHeight: 46, letterSpacing: -1.5 },
    overallLeft: { gap: 2 },
    overallValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

    statCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    statsSection: { gap: 12 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCard: {
        width: '48.25%',
        borderRadius: 16,
        padding: 14,
        paddingBottom: 0,
        gap: 6,
        overflow: 'hidden',
    },
    statHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statLabel: { fontSize: 11, letterSpacing: 0.3 },
    statValue: { fontSize: 32, lineHeight: 38, letterSpacing: -1, paddingBottom: 10 },
    progressTrack: { height: 4, borderRadius: 2, marginBottom: 14, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },
});