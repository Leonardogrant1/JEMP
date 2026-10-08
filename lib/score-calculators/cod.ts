import { ageFactor, toLevel } from './shared';

// 505-Norm wörtlich aus lower-body-plyometrics.ts umgezogen (Phase 5, Spec §4.4).
const NORMS = {
    male:   { mean: 2.40, std: 0.20 },
    female: { mean: 2.65, std: 0.22 },
};

export function codLevel(
    timeSeconds: number,
    bodyWeight: number,
    age: number,
    gender: 'male' | 'female',
): number {
    const ageAdjusted   = timeSeconds * ageFactor(age, 'lower_body_plyometrics');
    const { mean, std } = NORMS[gender];
    const z             = (mean - ageAdjusted) / std;
    return toLevel(z);
}
