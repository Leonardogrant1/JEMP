import { ageFactor, toLevel } from './shared';

const NORMS = {
    mb_chest_throw_cm: {
        male:   { mean: 550, std: 120 },
        female: { mean: 350, std: 90  },
    },
    mb_rotational_throw_cm: {
        male:   { mean: 600, std: 130 },
        female: { mean: 400, std: 100 },
    },
    mb_overhead_throw_cm: {
        male:   { mean: 700, std: 150 },
        female: { mean: 450, std: 110 },
    },
    clap_push_ups: {
        male:   { mean: 10, std: 5 },
        female: { mean: 4,  std: 3 },
    },
};

export type UpperBodyPlyometricsExercise = keyof typeof NORMS;

/**
 * Calculates a 1–100 level score for upper body plyometrics.
 * Throws: higher distance = higher score.
 * Clap push-ups: higher reps = higher score.
 * Heavier athletes are slightly rewarded (more mass = more power in throws).
 * @param value       Distance in cm (throws) or reps (clap push-ups)
 * @param bodyWeight  Athlete weight in kg
 * @param age         Athlete age in years
 * @param gender      'male' | 'female'
 * @param exercise    Exercise key
 */
export function upperBodyPlyometricsLevel(
    value: number,
    bodyWeight: number,
    age: number,
    gender: 'male' | 'female',
    exercise: UpperBodyPlyometricsExercise,
): number {
    // No weight factor — no clear correlation between bodyweight and throwing distance
    const ageAdjusted   = value / ageFactor(age);
    const { mean, std } = NORMS[exercise][gender];
    const z             = (ageAdjusted - mean) / std;
    return toLevel(z);
}
