-- Follow-up to 20260601110000_seed_exercise_image_groups.sql.
-- Assigns image_group to exercises not covered by the first migration.
-- Exercises still not listed here stay NULL and fall back to SLUG_TO_GROUP client-side.

-- ─── Extend existing groups ──────────────────────────────────────────────────

UPDATE exercises SET image_group = 'squat_patterns'
WHERE slug IN ('bodyweight_squat', 'split_squat', 'assisted_pistol_squat',
               'sumo_squat_body_weight', 'banded_squat', 'wall_sit');

UPDATE exercises SET image_group = 'hip_hinge'
WHERE slug IN ('stiff_leg_deadlift', 'dumbbell_rdl', 'banded_romanian_deadlift',
               'banded_good_morning', 'wall_supported_hamstring_curl');

UPDATE exercises SET image_group = 'upper_push'
WHERE slug IN ('incline_dumbbell_press', 'landmine_press', 'wide_grip_push_up',
               'diamond_push_up', 'decline_push_up', 'archer_push_up', 'pike_push_up',
               'shoulder_tap_push_up', 'dumbbell_floor_press', 'banded_overhead_press',
               'banded_lateral_raise', 'banded_chest_press_floor', 'dumbbell_curl_to_press');

UPDATE exercises SET image_group = 'upper_pull'
WHERE slug IN ('dumbbell_row', 'band_pull_apart', 'scapular_pull_up', 'negative_pull_up',
               'banded_row', 'banded_face_pull', 'renegade_row', 'dumbbell_hip_hinge_row');

UPDATE exercises SET image_group = 'loaded_carry'
WHERE slug IN ('suitcase_carry');

UPDATE exercises SET image_group = 'conditioning'
WHERE slug IN ('jump_rope_standard', 'jumping_jacks', 'reactive_drop_catch');

UPDATE exercises SET image_group = 'mobility'
WHERE slug IN ('neck_circles');

-- ─── New groups ──────────────────────────────────────────────────────────────

UPDATE exercises SET image_group = 'lunges'
WHERE slug IN ('reverse_lunge', 'walking_lunge', 'lateral_lunge',
               'dumbbell_lateral_lunge', 'dumbbell_goblet_reverse_lunge',
               'dumbbell_step_up_to_press');

UPDATE exercises SET image_group = 'glute_hip_activation'
WHERE slug IN ('single_leg_glute_bridge', 'banded_monster_walk', 'lateral_band_walk',
               'banded_clamshell', 'donkey_kick', 'fire_hydrant',
               'standing_hip_abduction', 'standing_hip_extension', 'banded_kickback');

UPDATE exercises SET image_group = 'posterior_chain_iso'
WHERE slug IN ('reverse_hyperextension', 'back_extension_45deg', 'superman_hold');

UPDATE exercises SET image_group = 'calf_ankle'
WHERE slug IN ('single_leg_calf_raise', 'tibialis_raise', 'calf_raise_bilateral');

UPDATE exercises SET image_group = 'core'
WHERE slug IN ('dead_bug', 'bird_dog', 'ab_wheel_rollout', 'cable_chop',
               'hanging_leg_raise', 'hollow_body_hold', 'v_up', 'reverse_crunch',
               'bicycle_crunch', 'spiderman_plank', 'toe_touch_crunch', 'banded_bicycle');

UPDATE exercises SET image_group = 'adductor'
WHERE slug IN ('copenhagen_plank', 'copenhagen_hip_adduction');

UPDATE exercises SET image_group = 'sprint_drills'
WHERE slug IN ('a_skip_drill', 'b_skip_drill', 'high_knees', 'butt_kicks',
               'wall_drill_march', 'banded_hip_flexor_march');

-- ─── Development Mobility ────────────────────────────────────────────────────

UPDATE exercises SET image_group = 'mobility_development'
WHERE slug IN ('cossack_squat', 'loaded_cossack_squat',
               'atg_split_squat', 'loaded_atg_split_squat',
               'deep_squat_hold', 'loaded_deep_squat_hold',
               'bodyweight_good_morning', 'loaded_good_morning',
               'segmental_spinal_roll', 'jefferson_curl',
               'tempo_hip_cars', 'resisted_hip_cars',
               'deep_lunge_rotation', 'loaded_deep_lunge_rotation',
               'dowel_overhead_squat', 'overhead_squat_loaded',
               'hip_flexion_lift_off', 'sots_press');
