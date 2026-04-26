import { jumpLevel, bodyweightStrengthLevel, oneRmLevel, lowerBodyPlyometricsLevel, upperBodyPlyometricsLevel } from './index';
import type { JumpExercise, BodyweightExercise, OneRmExercise, LowerBodyPlyometricsExercise, UpperBodyPlyometricsExercise } from './index';
import { calculateAge } from '@/types/user-data';

export type AssessmentUserProfile = {
    gender: 'male' | 'female';
    weight_kg: number;
    height_cm: number;
    birth_date: string;
};

type ScoreEntry =
    | { type: 'jump';       exercise: JumpExercise }
    | { type: 'bodyweight'; exercise: BodyweightExercise }
    | { type: 'one_rm';     exercise: OneRmExercise }
    | { type: 'lower_plyo'; exercise: LowerBodyPlyometricsExercise }
    | { type: 'upper_plyo'; exercise: UpperBodyPlyometricsExercise };

const ASSESSMENT_SCORE_MAP: Record<string, ScoreEntry> = {
    // Jumps
    vertical_jump:              { type: 'jump',       exercise: 'vertical_jump' },
    broad_jump:                 { type: 'jump',       exercise: 'broad_jump' },
    box_jump:                   { type: 'jump',       exercise: 'box_jump' },
    // Strength — bodyweight
    max_pushups:                { type: 'bodyweight', exercise: 'pushup' },
    max_pullups:                { type: 'bodyweight', exercise: 'pullup' },
    max_dips:                   { type: 'bodyweight', exercise: 'dips' },
    // Strength — 1RM
    back_squat_1rm:             { type: 'one_rm',     exercise: 'back_squat' },
    hip_thrust_1rm:             { type: 'one_rm',     exercise: 'hip_thrust' },
    romanian_deadlift_1rm:      { type: 'one_rm',     exercise: 'romanian_deadlift' },
    bench_press_1rm:            { type: 'one_rm',     exercise: 'bench_press' },
    weighted_pullups_1rm:       { type: 'one_rm',     exercise: 'weighted_pullups' },
    // Lower body plyometrics
    sprint_10m:                 { type: 'lower_plyo', exercise: '10m_sprint' },
    sprint_30m:                 { type: 'lower_plyo', exercise: '30m_sprint' },
    sprint_10m_flying:          { type: 'lower_plyo', exercise: '10m_sprint_flying' },
    agility_505:                { type: 'lower_plyo', exercise: '505_agility' },
    // Upper body plyometrics
    mb_chest_throw:             { type: 'upper_plyo', exercise: 'mb_chest_throw_cm' },
    mb_rotational_throw:        { type: 'upper_plyo', exercise: 'mb_rotational_throw_cm' },
    mb_overhead_throw:          { type: 'upper_plyo', exercise: 'mb_overhead_throw_cm' },
    clap_pushups:               { type: 'upper_plyo', exercise: 'clap_push_ups' },
};

/**
 * Returns a 1-100 level score for an assessment result.
 * Returns null if no calculator is mapped for this slug.
 */
export function calculateAssessmentScore(
    assessmentSlug: string,
    value: number,
    profile: AssessmentUserProfile,
): number | null {
    const entry = ASSESSMENT_SCORE_MAP[assessmentSlug];
    if (!entry) return null;

    const { gender, weight_kg, height_cm, birth_date } = profile;
    const age = calculateAge(birth_date);

    switch (entry.type) {
        case 'jump':
            return jumpLevel(value, height_cm, weight_kg, age, gender, entry.exercise);
        case 'bodyweight':
            return bodyweightStrengthLevel(value, weight_kg, age, gender, entry.exercise);
        case 'one_rm': {
            // Weighted pull-ups: user enters added weight only — add bodyweight internally
            const liftedWeight = entry.exercise === 'weighted_pullups' ? value + weight_kg : value;
            return oneRmLevel(liftedWeight, weight_kg, age, gender, entry.exercise);
        }
        case 'lower_plyo':
            return lowerBodyPlyometricsLevel(value, weight_kg, age, gender, entry.exercise);
        case 'upper_plyo':
            return upperBodyPlyometricsLevel(value, weight_kg, age, gender, entry.exercise);
    }
}
