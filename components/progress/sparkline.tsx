import { Colors, Cyan, GradientMid } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { CategoryHistoryPoint } from "@/queries/use-user-category-history-query";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import Reanimated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";
import Svg, { Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";

const PAD_TOP = 4;

interface SparklineProps {
    data: CategoryHistoryPoint[];
    height?: number;
    negative?: boolean; // red rendering for a declining trend
    delay?: number; // reveal stagger in ms
    bounded?: boolean; // false for free-scale values (kg, reps) instead of the 0–100 score domain
}

export function Sparkline({ data, height = 40, negative, delay = 0, bounded = true }: SparklineProps) {
    const [width, setWidth] = useState(0);
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { linePath, areaPath } = useMemo(() => {
        if (width === 0 || data.length < 2) return { linePath: '', areaPath: '' };

        const innerH = height - PAD_TOP - 2;
        const scores = data.map(d => d.score);
        const pad = bounded ? 5 : Math.max((Math.max(...scores) - Math.min(...scores)) * 0.1, 1);
        const minScore = bounded ? Math.max(0, Math.min(...scores) - pad) : Math.min(...scores) - pad;
        const maxScore = bounded ? Math.min(100, Math.max(...scores) + pad) : Math.max(...scores) + pad;
        const range = maxScore - minScore || 10;

        const pts = data.map((d, i) => ({
            x: (i / (data.length - 1)) * width,
            y: PAD_TOP + (1 - (d.score - minScore) / range) * innerH,
        }));

        const line = pts.reduce((acc, p, i) => {
            if (i === 0) return `M ${p.x} ${p.y}`;
            const prev = pts[i - 1];
            const cp1x = prev.x + (p.x - prev.x) / 3;
            const cp2x = p.x - (p.x - prev.x) / 3;
            return `${acc} C ${cp1x} ${prev.y}, ${cp2x} ${p.y}, ${p.x} ${p.y}`;
        }, '');

        const area = `${line} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`;

        return { linePath: line, areaPath: area };
    }, [data, width, height, bounded]);

    const reveal = useSharedValue(0);
    useEffect(() => {
        if (!linePath) return;
        reveal.value = 0;
        reveal.value = withDelay(delay, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    }, [linePath, delay, reveal]);

    const clipStyle = useAnimatedStyle(() => ({
        width: reveal.value * width,
    }));

    // Empty state: a dashed flatline where the chart would be
    if (data.length < 2) {
        return (
            <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
                {width > 0 && (
                    <Svg width={width} height={height}>
                        <Line
                            x1={8}
                            y1={height / 2}
                            x2={width - 8}
                            y2={height / 2}
                            stroke={theme.textMuted}
                            strokeOpacity={0.35}
                            strokeWidth={1.5}
                            strokeDasharray="1 7"
                            strokeLinecap="round"
                        />
                    </Svg>
                )}
            </View>
        );
    }

    const lineColor = negative ? '#ef4444' : Cyan[400];
    const fillColor = negative ? '#ef4444' : GradientMid;
    const gradientId = negative ? 'sparkFillNeg' : 'sparkFillPos';

    return (
        <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
            {width > 0 && (
                <Reanimated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' }, clipStyle]}>
                    <Svg width={width} height={height}>
                        <Defs>
                            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor={fillColor} stopOpacity={0.3} />
                                <Stop offset="1" stopColor={fillColor} stopOpacity={0} />
                            </LinearGradient>
                        </Defs>
                        <Path d={areaPath} fill={`url(#${gradientId})`} />
                        <Path d={linePath} stroke={lineColor} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </Reanimated.View>
            )}
        </View>
    );
}
