import { ageFactor, toLevel } from './shared';

// ─────────────────────────────────────────────────────────────
// Bodyweight strength (reps-based)
// ─────────────────────────────────────────────────────────────

const BODYWEIGHT_CONFIG = {
    pushup: {
        weightMultiplier: 1.0,
        norms:    { male: { mean: 35, std: 15 }, female: { mean: 20, std: 10 } },
        normsWeighted: { male: { mean: 1.3, std: 0.25 }, female: { mean: 1.15, std: 0.2 } },
    },
    pullup: {
        weightMultiplier: 1.3,
        norms:    { male: { mean: 8,  std: 4  }, female: { mean: 3,  std: 2  } },
        normsWeighted: { male: { mean: 1.5, std: 0.3  }, female: { mean: 1.1, std: 0.25 } },
    },
    dips: {
        weightMultiplier: 1.15,
        norms:    { male: { mean: 15, std: 7  }, female: { mean: 6,  std: 3  } },
        normsWeighted: { male: { mean: 1.4, std: 0.3  }, female: { mean: 1.2, std: 0.25 } },
    },
};

export type BodyweightExercise = keyof typeof BODYWEIGHT_CONFIG;

/**
 * Calculates a 1–100 level score for bodyweight strength exercises.
 * Supports both reps-based and weighted (belt/vest) variants.
 * @param reps              Max reps in one set
 * @param bodyWeight        Athlete weight in kg
 * @param age               Athlete age in years
 * @param gender            'male' | 'female'
 * @param exercise          Exercise key
 * @param additionalWeight  Extra weight in kg, default 0
 */
export function bodyweightStrengthLevel(
    reps: number,
    bodyWeight: number,
    age: number,
    gender: 'male' | 'female',
    exercise: BodyweightExercise,
    additionalWeight: number = 0,
): number {
    const config = BODYWEIGHT_CONFIG[exercise];
    let strengthIndex: number;
    let norms: { mean: number; std: number };

    if (additionalWeight > 0) {
        strengthIndex = (bodyWeight + additionalWeight) / bodyWeight;
        norms = config.normsWeighted[gender];
    } else {
        strengthIndex = reps * (bodyWeight / 75) * config.weightMultiplier;
        norms = config.norms[gender];
    }

    const ageAdjusted = strengthIndex / ageFactor(age);
    const z = (ageAdjusted - norms.mean) / norms.std;

    return toLevel(z);
}

// ─────────────────────────────────────────────────────────────
// 1RM strength
// ─────────────────────────────────────────────────────────────

const ONE_RM_NORMS = {
    back_squat: {
        male:   { mean: 1.5,  std: 0.4  },
        female: { mean: 1.0,  std: 0.3  },
    },
    hip_thrust: {
        male:   { mean: 1.8,  std: 0.4  },
        female: { mean: 1.4,  std: 0.35 },
    },
    romanian_deadlift: {
        male:   { mean: 1.4,  std: 0.35 },
        female: { mean: 0.9,  std: 0.25 },
    },
    bench_press: {
        male:   { mean: 1.2,  std: 0.35 },
        female: { mean: 0.7,  std: 0.25 },
    },
    weighted_pullups: {
        male:   { mean: 1.5,  std: 0.3  },
        female: { mean: 1.1,  std: 0.25 },
    },
};

export type OneRmExercise = keyof typeof ONE_RM_NORMS;

/**
 * Calculates a 1–100 level score for a 1RM lift.
 * Uses relative strength (lifted / bodyweight) as the base metric.
 * @param liftedWeight  1RM weight in kg
 * @param bodyWeight    Athlete weight in kg
 * @param age           Athlete age in years
 * @param gender        'male' | 'female'
 * @param exercise      Exercise key
 */
export function oneRmLevel(
    liftedWeight: number,
    bodyWeight: number,
    age: number,
    gender: 'male' | 'female',
    exercise: OneRmExercise,
): number {
    const relativeStrength = liftedWeight / bodyWeight;
    const ageAdjusted      = relativeStrength / ageFactor(age);

    const { mean, std } = ONE_RM_NORMS[exercise][gender];
    const z = (ageAdjusted - mean) / std;

    return toLevel(z);
}
