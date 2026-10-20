import { ageFactor, toLevel } from './shared';

// Repeated Sprint Test (Spec §4.4): Drop-off % UND Absolutzeit kombiniert —
// reiner Drop-off würde Langsamkeit strukturell belohnen (wer weit unter
// seinem Limit läuft, ermüdet kaum). Gewichtung 60/40 als Implementierungs-
// Konstante, Lauf-1 fließt separat in den Sprint-Score (Prioritäts-Regel).
const RST_DROP = { mean: 6.0, std: 3.0 }; // % Abfall first2 → last2
const RST_MEAN_TIME = {
    male:   { mean: 4.45, std: 0.35 },    // 30m wiederholt, leicht über Einzelsprint-Norm
    female: { mean: 5.15, std: 0.40 },
};
const DROP_WEIGHT = 0.6;

export function rstConditioningLevel(times: number[], age: number, gender: 'male' | 'female'): number {
    const first2 = (times[0] + times[1]) / 2;
    const last2  = (times[times.length - 2] + times[times.length - 1]) / 2;
    const dropOffPct = ((last2 - first2) / first2) * 100;
    const meanTime = times.reduce((a, b) => a + b, 0) / times.length;

    const factor = ageFactor(age, 'lower_body_plyometrics');
    const zDrop = (RST_DROP.mean - dropOffPct) / RST_DROP.std;
    const { mean, std } = RST_MEAN_TIME[gender];
    const zMean = (mean - meanTime * factor) / std;

    return toLevel(DROP_WEIGHT * zDrop + (1 - DROP_WEIGHT) * zMean);
}

// Cooper 12-min (publizierte Normen, Alter via ageFactor): Fallback ohne 30m-Strecke.
const COOPER = {
    male:   { mean: 2400, std: 350 },
    female: { mean: 2000, std: 320 },
};

export function cooperLevel(distanceMeters: number, age: number, gender: 'male' | 'female'): number {
    const ageAdjusted = distanceMeters / ageFactor(age, 'lower_body_plyometrics');
    const { mean, std } = COOPER[gender];
    const z = (ageAdjusted - mean) / std;
    return toLevel(z);
}
