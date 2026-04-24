import { Electric } from '@/constants/theme';
import { useMemo } from 'react';
import { Path, Svg } from 'react-native-svg';

interface SparklineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
    strokeWidth?: number;
}

/**
 * Minimal SVG sparkline. Renders a smooth line through normalised data points.
 * Needs at least 2 data points to draw anything.
 */
export function Sparkline({
    data,
    width = 100,
    height = 40,
    color = Electric[500],
    strokeWidth = 2,
}: SparklineProps) {
    const path = useMemo(() => {
        if (data.length < 2) return null;

        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1; // avoid division by zero when all values equal

        const pad = strokeWidth;
        const innerW = width - pad * 2;
        const innerH = height - pad * 2;

        const points = data.map((v, i) => ({
            x: pad + (i / (data.length - 1)) * innerW,
            y: pad + (1 - (v - min) / range) * innerH,
        }));

        // Smooth cubic bezier curve through points
        const d = points.reduce((acc, p, i) => {
            if (i === 0) return `M ${p.x} ${p.y}`;
            const prev = points[i - 1];
            const cp1x = prev.x + (p.x - prev.x) / 3;
            const cp1y = prev.y;
            const cp2x = p.x - (p.x - prev.x) / 3;
            const cp2y = p.y;
            return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${p.y}`;
        }, '');

        return d;
    }, [data, width, height, strokeWidth]);

    if (!path) return null;

    return (
        <Svg width={width} height={height}>
            <Path
                d={path}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}
