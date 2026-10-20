// Repeated Sprint Test (Spec §4.4): 6 × 30 m / 25 s Pause. Die App rechnet
// Drop-off und Durchschnitt; Lauf 1 füttert den Sprint-Score nur, wenn kein
// dedizierter Sprint-Test innerhalb des Aging-Fensters existiert.

import { STALE_AFTER_DAYS } from './pillar-score';

export const RST_RUN_COUNT = 6;
export const RST_REST_SECONDS = 25;
const DEDICATED_SPRINT_SLUGS = new Set(['sprint_10m', 'sprint_30m', 'sprint_10m_flying']);

export type RstDerived = { dropOffPct: number; meanTime: number; run1: number };

/** Warum rstDerive ablehnt — die UI braucht die Ursache für die richtige
 *  Fehlermeldung: 'range' = Zeit außerhalb 2–10 s (z. B. Stoppuhr zu früh
 *  gestoppt), 'order' = letzte Läufe deutlich schneller (Rückwärts-Eingabe). */
export function rstInvalidReason(times: number[]): 'range' | 'order' | null {
    if (times.length !== RST_RUN_COUNT) return null;
    if (times.some((t) => !Number.isFinite(t) || t < 2 || t > 10)) return 'range';
    const first2 = (times[0] + times[1]) / 2;
    const last2 = (times[4] + times[5]) / 2;
    // "Ascending-ish" (Review M8): deutlich schnellere letzte Läufe deuten auf
    // Rückwärts-Eingabe — negativer Drop-off würde den Score aufblasen.
    if (last2 < first2 * 0.97) return 'order';
    return null;
}

/** Validiert 6 plausible Zeiten (2–10 s) und leitet Drop-off/Durchschnitt ab. */
export function rstDerive(times: number[]): RstDerived | null {
    if (times.length !== RST_RUN_COUNT) return null;
    if (rstInvalidReason(times) !== null) return null;
    const first2 = (times[0] + times[1]) / 2;
    const last2 = (times[4] + times[5]) / 2;
    const dropOffPct = ((last2 - first2) / first2) * 100;
    const meanTime = times.reduce((a, b) => a + b, 0) / RST_RUN_COUNT;
    return { dropOffPct: Math.round(dropOffPct * 10) / 10, meanTime: Math.round(meanTime * 100) / 100, run1: times[0] };
}

/** Prioritäts-Regel (§4.4): dedizierter Sprint-Test ≤120 Tage gewinnt — auch
 *  wenn er älter als der RST ist. Nur ohne frischen dedizierten Test darf
 *  Lauf 1 den Sprint-Score füttern. */
export function shouldFeedSprintScore(
    existing: Array<{ assessmentSlug: string; completedAt: string; sourceType?: string }>,
    now: Date,
): boolean {
    // Review I2: RST-gespeiste Einträge (source_type 'derived') zählen nicht als
    // dedizierter Test — sonst blockiert der erste RST alle weiteren Feeds.
    return !existing.some((e) =>
        DEDICATED_SPRINT_SLUGS.has(e.assessmentSlug) &&
        e.sourceType !== 'derived' &&
        (now.getTime() - new Date(e.completedAt).getTime()) / 86400000 <= STALE_AFTER_DAYS,
    );
}
