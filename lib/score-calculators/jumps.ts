import { ageFactor, toLevel } from './shared';

const NORMS = {
    vertical_jump: {
        male:   { mean: 28, std: 7 },
        female: { mean: 20, std: 5 },
    },
    broad_jump: {
        male:   { mean: 220, std: 35 },
        female: { mean: 170, std: 28 },
    },
    box_jump: {
        male:   { mean: 65, std: 20 },
        female: { mean: 40, std: 15 },
    },
};

const USES_HEIGHT_NORM: Record<JumpExercise, boolean> = {
    vertical_jump: true,
    broad_jump:    true,
    box_jump:      false, // power/technique metric — height normalization not relevant
};

export type JumpExercise = keyof typeof NORMS;

/**
 * Calculates a 1–100 level score for jump exercises.
 * @param distance    Jump height or distance in cm
 * @param bodyHeight  Athlete height in cm (ignored for box jump)
 * @param bodyWeight  Athlete weight in kg
 * @param age         Athlete age in years
 * @param gender      'male' | 'female'
 * @param exercise    Exercise key
 */
export function jumpLevel(
    distance: number,
    bodyHeight: number,
    bodyWeight: number,
    age: number,
    gender: 'male' | 'female',
    exercise: JumpExercise,
): number {
    const base           = USES_HEIGHT_NORM[exercise] ? (distance / bodyHeight) * 100 : distance;
    const weightAdjusted = base * Math.sqrt(75 / bodyWeight);
    const ageAdjusted    = weightAdjusted / ageFactor(age);

    const { mean, std } = NORMS[exercise][gender];
    const z = (ageAdjusted - mean) / std;

    return toLevel(z);
}
