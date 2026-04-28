import { GAUGE_START, GAUGE_SWEEP, OVERALL_CX, OVERALL_CY, OVERALL_R, OVERALL_SIZE, OVERALL_STROKE } from "@/constants/progress-constants";
import { Colors } from "@/constants/theme";
import { gaugeColor, svgArcPath } from "@/helpers/progress-helpers";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { JempText } from "../jemp-text";
import { TrendBadge } from "./trend-badge";

export function OverallCard({ value, trend }: { value: number; trend: number | null }) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const fillSweep = useMemo(() => Math.max(0, (value / 100) * GAUGE_SWEEP), [value]);
    const bgPath = useMemo(() => svgArcPath(OVERALL_CX, OVERALL_CY, OVERALL_R, GAUGE_START, GAUGE_START + GAUGE_SWEEP), []);
    const fillPath = useMemo(() => value > 0
        ? svgArcPath(OVERALL_CX, OVERALL_CY, OVERALL_R, GAUGE_START, GAUGE_START + fillSweep)
        : null, [value]);

    return (
        <View style={[styles.overallCard, { backgroundColor: theme.surface }]}>
            <View style={styles.overallCardHeader}>
                <JempText type="caption" color={theme.textMuted} style={styles.statLabel}>{t('category.overall')}</JempText>
                {trend !== null && <TrendBadge trend={trend} />}
            </View>
            <View style={styles.overallGaugeWrap}>
                <Svg width={OVERALL_SIZE} height={OVERALL_SIZE}>
                    <Path d={bgPath} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={OVERALL_STROKE} strokeLinecap="round" />
                    {fillPath && (
                        <Path d={fillPath} fill="none" stroke={gaugeColor(value)} strokeWidth={OVERALL_STROKE} strokeLinecap="round" />
                    )}
                </Svg>
                <View style={[StyleSheet.absoluteFill, styles.gaugeCenter]}>
                    <JempText type="h1" color={gaugeColor(value)} style={styles.overallScore}>
                        {String(value)}
                    </JempText>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
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
    gaugeCenter: { alignItems: 'center', justifyContent: 'center' },
    overallScore: { fontSize: 40, lineHeight: 46, letterSpacing: -1.5 },
    statLabel: { fontSize: 11, letterSpacing: 0.3 },
});