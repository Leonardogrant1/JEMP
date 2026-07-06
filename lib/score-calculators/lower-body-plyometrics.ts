import { ageFactor, toLevel } from './shared';

const NORMS = {
    '10m_sprint': {
        male:   { mean: 1.80, std: 0.15 },
        female: { mean: 2.10, std: 0.18 },
    },
    '30m_sprint': {
        male:   { mean: 4.20, std: 0.35 },
        female: { mean: 4.90, std: 0.40 },
    },
    '10m_sprint_flying': {
        male:   { mean: 1.50, std: 0.12 },
        female: { mean: 1.75, std: 0.15 },
    },
    '505_agility': {
        male:   { mean: 2.40, std: 0.20 },
        female: { mean: 2.65, std: 0.22 },
    },
};

export type LowerBodyPlyometricsExercise = keyof typeof NORMS;

export function lowerBodyPlyometricsLevel(
    timeSeconds: number,
    bodyWeight: number,
    age: number,
    gender: 'male' | 'female',
    exercise: LowerBodyPlyometricsExercise,
): number {
    const ageAdjusted   = timeSeconds * ageFactor(age, 'lower_body_plyometrics');
    const { mean, std } = NORMS[exercise][gender];
    const z             = (mean - ageAdjusted) / std;
    return toLevel(z);
}
