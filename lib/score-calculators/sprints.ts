import { ageFactor, toLevel } from './shared';

// Normen wörtlich aus lower-body-plyometrics.ts umgezogen (Phase 5, Spec §4.4) —
// Kontinuität: gleiche Inputs liefern exakt die alten Scores.
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
};

export type SprintExercise = keyof typeof NORMS;

export function sprintLevel(
    timeSeconds: number,
    bodyWeight: number,
    age: number,
    gender: 'male' | 'female',
    exercise: SprintExercise,
): number {
    const ageAdjusted   = timeSeconds * ageFactor(age, 'lower_body_plyometrics');
    const { mean, std } = NORMS[exercise][gender];
    const z             = (mean - ageAdjusted) / std;
    return toLevel(z);
}
