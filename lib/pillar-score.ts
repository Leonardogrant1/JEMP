// Säulen-Score-Schicht (Spec §4.3, §4.7): Rohwerte sind sportartunabhängig,
// der Gesamt-Score wird IMMER live gewichtet berechnet — nie persistiert.

export const STALE_AFTER_DAYS = 120;

export type PillarValue = { slug: string; level: number };
export type PillarWeight = { slug: string; weight: number };

/** Gewichteter Gesamt-Score, renormalisiert über Säulen, die in BEIDEN Listen stehen. */
export function weightedOverall(values: PillarValue[], weights: PillarWeight[]): number | null {
    const weightBySlug = new Map(weights.map((w) => [w.slug, w.weight]));
    let sum = 0;
    let weightSum = 0;
    for (const v of values) {
        const w = weightBySlug.get(v.slug);
        if (w === undefined || w <= 0) continue;
        sum += v.level * w;
        weightSum += w;
    }
    if (weightSum === 0) return null;
    return Math.round(sum / weightSum);
}

export type HistoryPoint = { slug: string; level: number; recordedAt: string };

/** Gesamt-Score-Serie via LOCF: pro Zeitpunkt der letzte Wert jeder Säule ≤ t;
 *  Säulen ohne Wert bis t werden ausgeschlossen (Renormalisierung), nie als 0 gezählt. */
export function overallSeries(
    points: HistoryPoint[],
    weights: PillarWeight[],
): Array<{ recordedAt: string; level: number }> {
    const sorted = [...points].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    const timestamps = [...new Set(sorted.map((p) => p.recordedAt))];
    const latest = new Map<string, number>();
    const series: Array<{ recordedAt: string; level: number }> = [];
    let idx = 0;
    for (const t of timestamps) {
        while (idx < sorted.length && sorted[idx].recordedAt <= t) {
            latest.set(sorted[idx].slug, sorted[idx].level);
            idx += 1;
        }
        const values: PillarValue[] = [...latest.entries()].map(([slug, level]) => ({ slug, level }));
        const level = weightedOverall(values, weights);
        if (level !== null) series.push({ recordedAt: t, level });
    }
    return series;
}

/** Quellen-Status einer Säule (Spec §4.1): gemessen / veraltet / geschätzt. */
export function pillarSourceStatus(
    source: 'self_estimate' | 'measured' | null | undefined,
    measuredAt: string | null | undefined,
    now: Date,
): 'measured' | 'stale' | 'estimated' {
    if (source !== 'measured' || !measuredAt) return 'estimated';
    const ageDays = (now.getTime() - new Date(measuredAt).getTime()) / 86400000;
    return ageDays > STALE_AFTER_DAYS ? 'stale' : 'measured';
}
