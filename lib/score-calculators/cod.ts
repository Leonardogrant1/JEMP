import { ageFactor, toLevel } from './shared';

// 505-Norm wörtlich aus lower-body-plyometrics.ts umgezogen (Phase 5, Spec §4.4).
const NORMS = {
    male:   { mean: 2.40, std: 0.20 },
    female: { mean: 2.65, std: 0.22 },
};

// Zusatz-Tests (08.10.): 5-10-5 (Teamsport-Lateral-Standard) und Hexagon
// (anlaufstreckenfrei — der Kämpfer-Test). Publizierte Freizeitsportler-Normen.
const TEST_NORMS = {
    pro_agility: {
        male:   { mean: 5.00, std: 0.35 },
        female: { mean: 5.60, std: 0.40 },
    },
    hexagon: {
        male:   { mean: 12.20, std: 2.00 },
        female: { mean: 13.20, std: 2.20 },
    },
};

export type CodTest = keyof typeof TEST_NORMS;

export function codTestLevel(
    timeSeconds: number,
    age: number,
    gender: 'male' | 'female',
    test: CodTest,
): number {
    const ageAdjusted   = timeSeconds * ageFactor(age, 'lower_body_plyometrics');
    const { mean, std } = TEST_NORMS[test][gender];
    const z             = (mean - ageAdjusted) / std;
    return toLevel(z);
}

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
