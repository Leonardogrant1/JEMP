import { CHART_HEIGHT, CHART_PAD_BOTTOM, CHART_PAD_TOP } from "@/constants/progress-constants";
import { Cyan } from "@/constants/theme";
import { CategoryHistoryPoint } from "@/queries/use-user-category-history-query";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { JempText } from "../jemp-text";

interface TrajectoryChartProps {
    data: CategoryHistoryPoint[];
    emptyLabel: string;
}

export function TrajectoryChart({ data, emptyLabel }: TrajectoryChartProps) {
    const [width, setWidth] = useState(0);

    const linePath = useMemo(() => {
        if (width === 0 || data.length < 1) return '';

        const innerH = CHART_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM;
        const scores = data.map(d => d.score);
        const minScore = Math.max(0, Math.min(...scores) - 5);
        const maxScore = Math.min(100, Math.max(...scores) + 5);
        const range = maxScore - minScore || 10;

        const pts = data.map((d, i) => ({
            x: data.length === 1 ? width / 2 : (i / (data.length - 1)) * width,
            y: CHART_PAD_TOP + (1 - (d.score - minScore) / range) * innerH,
        }));

        return pts.reduce((acc, p, i) => {
            if (i === 0) return `M ${p.x} ${p.y}`;
            const prev = pts[i - 1];
            const cp1x = prev.x + (p.x - prev.x) / 3;
            const cp2x = p.x - (p.x - prev.x) / 3;
            return `${acc} C ${cp1x} ${prev.y}, ${cp2x} ${p.y}, ${p.x} ${p.y}`;
        }, '');
    }, [data, width]);

    if (data.length < 1) {
        return (
            <View style={styles.chartEmpty}>
                <JempText type="caption" color="#666">{emptyLabel}</JempText>
            </View>
        );
    }

    const firstScore = data[0].score;
    const lastScore = data[data.length - 1].score;

    return (
        <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ height: CHART_HEIGHT }}>
            {width > 0 && (
                <>
                    <Svg width={width} height={CHART_HEIGHT} style={StyleSheet.absoluteFill}>
                        <Path d={linePath} stroke={Cyan[500]} strokeWidth={14} fill="none" strokeOpacity={0.06} strokeLinecap="round" />
                        <Path d={linePath} stroke={Cyan[500]} strokeWidth={7} fill="none" strokeOpacity={0.12} strokeLinecap="round" />
                        <Path d={linePath} stroke={Cyan[400]} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                    {/* Start / end value labels */}
                    <View style={styles.chartValueRow} pointerEvents="none">
                        <JempText type="caption" color="#666" style={styles.chartValueLabel}>
                            {firstScore}
                        </JempText>
                        <JempText type="caption" color={Cyan[400]} style={[styles.chartValueLabel, styles.chartValueLabelEnd]}>
                            {lastScore}
                        </JempText>
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    trajCard: {
        borderRadius: 20,
        padding: 16,
        paddingBottom: 8,
        gap: 4,
    },
    trajHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    trendText: { fontWeight: '600' },
    chartEmpty: {
        height: CHART_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartValueRow: {
        position: 'absolute',
        bottom: 4,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    chartValueLabel: { fontSize: 11, opacity: 0.7 },
    chartValueLabelEnd: { opacity: 1 },
});
