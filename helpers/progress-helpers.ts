import { CategoryHistoryPoint } from "@/queries/use-user-category-history-query";
import { TimeFrame } from "@/types/progress-types";
  
function timeFrameToSince(tf: TimeFrame): string {
    const months = tf === '3M' ? 3 : tf === '6M' ? 6 : 12;
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d.toISOString();
}

function computeTrend(data: CategoryHistoryPoint[]): number | null {
    if (data.length < 2) return null;
    return data[data.length - 1].score - data[0].score;
}

function svgArcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
    const rad = (d: number) => d * Math.PI / 180;
    const sx = cx + r * Math.cos(rad(startDeg));
    const sy = cy + r * Math.sin(rad(startDeg));
    const ex = cx + r * Math.cos(rad(endDeg));
    const ey = cy + r * Math.sin(rad(endDeg));
    const sweep = endDeg - startDeg;
    const large = sweep > 180 ? 1 : 0;
    return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

function gaugeColor(score: number): string {
    if (score >= 75) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
}


export { computeTrend, gaugeColor, svgArcPath, timeFrameToSince };
