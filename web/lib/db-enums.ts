// Runtime-Kopie der DB-Enum-Werte für die Web-App. Die generierten Constants
// in ../../database.types.ts liegen außerhalb des Turbopack-Roots (web/) und
// können daher nur als Typen importiert werden, nicht als Werte.
// Der AssertAll-Guard lässt den Typecheck fehlschlagen, sobald die Listen von
// den generierten Enum-Typen abweichen (fehlende ODER ungültige Werte).

import type { Database } from '../../database.types'

type Enums = Database['public']['Enums']
type AssertAll<T extends string, A extends readonly T[]> =
  Exclude<T, A[number]> extends never ? true : ['fehlende Enum-Werte:', Exclude<T, A[number]>]

export const BODY_REGIONS = [
  'ankle', 'calf', 'knee', 'quad', 'hamstring', 'glute', 'hip', 'groin',
  'lower_back', 'core', 'obliques', 'thoracic', 'upper_back', 'chest',
  'shoulder', 'bicep', 'tricep', 'forearm', 'full_body', 'neck',
] as const satisfies readonly Enums['body_region'][]

export const MOVEMENT_PATTERNS = [
  'push', 'pull', 'legs', 'core', 'isometric', 'plyometric', 'mobility', 'cardio', 'other',
] as const satisfies readonly Enums['movement_pattern'][]

export const LATERALITIES = [
  'bilateral', 'unilateral', 'alternating',
] as const satisfies readonly Enums['laterality'][]

export const EXERCISE_IMAGE_GROUPS = [
  'squat_patterns', 'hip_hinge', 'hip_thrust', 'upper_push', 'upper_pull',
  'olympic_lifts', 'dumbbell_complex', 'loaded_carry', 'vertical_jumps',
  'horizontal_jumps', 'hurdle_hops', 'reactive_jumps', 'sprints',
  'sled_exercises', 'agility', 'conditioning', 'medicine_ball',
  'explosive_push', 'mobility', 'lunges', 'glute_hip_activation',
  'posterior_chain_iso', 'calf_ankle', 'core', 'adductor', 'sprint_drills',
  'mobility_development',
] as const satisfies readonly Enums['exercise_image_group'][]

// Vollständigkeits-Guards (satisfies prüft nur Gültigkeit, nicht Vollständigkeit)
const _bodyRegionsComplete: AssertAll<Enums['body_region'], typeof BODY_REGIONS> = true
const _movementPatternsComplete: AssertAll<Enums['movement_pattern'], typeof MOVEMENT_PATTERNS> = true
const _lateralitiesComplete: AssertAll<Enums['laterality'], typeof LATERALITIES> = true
const _imageGroupsComplete: AssertAll<Enums['exercise_image_group'], typeof EXERCISE_IMAGE_GROUPS> = true
void _bodyRegionsComplete; void _movementPatternsComplete; void _lateralitiesComplete; void _imageGroupsComplete
