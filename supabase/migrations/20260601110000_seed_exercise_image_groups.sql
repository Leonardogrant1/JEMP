-- supabase/migrations/20260601110000_seed_exercise_image_groups.sql
-- Populates image_group for all exercises currently in exercise-groups.ts.
-- Exercises not listed here stay NULL and fall back to SLUG_TO_GROUP client-side.

UPDATE exercises SET image_group = 'squat_patterns'
WHERE slug IN ('back_squat', 'front_squat', 'bulgarian_split_squat', 'pistol_squat');

UPDATE exercises SET image_group = 'hip_hinge'
WHERE slug IN ('conventional_deadlift', 'sumo_deadlift', 'trap_bar_deadlift',
               'romanian_deadlift', 'nordic_curl', 'nordic_hamstring_curl');

UPDATE exercises SET image_group = 'hip_thrust'
WHERE slug IN ('hip_thrust', 'banded_hip_thrust');

UPDATE exercises SET image_group = 'upper_push'
WHERE slug IN ('bench_press', 'incline_bench_press', 'push_up', 'dips',
               'tricep_dip', 'push_press');

UPDATE exercises SET image_group = 'upper_pull'
WHERE slug IN ('pull_up', 'chin_up', 'weighted_pull_up');

UPDATE exercises SET image_group = 'olympic_lifts'
WHERE slug IN ('power_clean', 'hang_power_clean', 'power_snatch', 'hang_power_snatch');

UPDATE exercises SET image_group = 'dumbbell_complex'
WHERE slug IN ('dumbbell_thruster', 'dumbbell_snatch', 'dumbbell_clean', 'dumbbell_swing');

UPDATE exercises SET image_group = 'loaded_carry'
WHERE slug IN ('farmers_walk', 'isometric_mid_thigh_pull');

UPDATE exercises SET image_group = 'vertical_jumps'
WHERE slug IN ('box_jump', 'depth_jump', 'drop_jump', 'vertical_jump',
               'single_leg_box_jump', 'jump_squat', 'squat_jump_to_stick');

UPDATE exercises SET image_group = 'horizontal_jumps'
WHERE slug IN ('broad_jump', 'lateral_bounds', 'lateral_hurdle_hop');

UPDATE exercises SET image_group = 'hurdle_hops'
WHERE slug IN ('hurdle_hops');

UPDATE exercises SET image_group = 'reactive_jumps'
WHERE slug IN ('pogos');

UPDATE exercises SET image_group = 'sprints'
WHERE slug IN ('sprint_10m', 'sprint_30m', 'sprint_10m_flying', 'flying_20_sprint',
               'resisted_sprint', 'sprint_parachute_run', 'sprint_start_blocks',
               'acceleration_sprint_10m', 'banded_sprint_resistance_run',
               'sprint_in_place', 'stair_sprint', 'prowler_push_sprint');

UPDATE exercises SET image_group = 'sled_exercises'
WHERE slug IN ('sled_push', 'sled_pull');

UPDATE exercises SET image_group = 'agility'
WHERE slug IN ('agility_505', 'pro_agility_shuttle', 't_drill',
               'agility_ladder_ickey_shuffle', 'agility_ladder_single_leg_hops',
               'lateral_shuffle');

UPDATE exercises SET image_group = 'conditioning'
WHERE slug IN ('burpee', 'burpee_broad_jump', 'bear_crawl', 'star_jump',
               'jump_rope_double_under', 'mountain_climber', 'shadow_boxing');

UPDATE exercises SET image_group = 'medicine_ball'
WHERE slug IN ('mb_chest_throw', 'mb_overhead_throw', 'mb_rotational_throw',
               'medicine_ball_slam', 'rotational_med_ball_throw',
               'med_ball_chest_pass', 'med_ball_overhead_throw', 'med_ball_scoop_toss');

UPDATE exercises SET image_group = 'explosive_push'
WHERE slug IN ('clap_push_up');

UPDATE exercises SET image_group = 'mobility'
WHERE slug IN (
    'glute_foam_roll', 'yoga_sun_salutation', 'shoulder_cars', 'wrist_mobility_circles',
    'worlds_greatest_stretch', 'standing_spinal_rotation', 'prone_hip_internal_rotation',
    'hip_90_90_stretch', 'leg_swing_side_to_side', 'ankle_cars', 'hip_flexor_lunge_stretch',
    'hip_cars', 'leg_swing_front_to_back', 'supine_twist', 'thoracic_foam_roll',
    'arm_circle', 'quad_foam_roll', 'lat_foam_roll', 'kneeling_adductor_stretch',
    'it_band_foam_roll', 'hamstring_foam_roll', 'diaphragmatic_breathing', 'cat_cow_stretch',
    'childs_pose', 'doorway_chest_stretch', 'box_breathing', 'standing_quad_stretch',
    'banded_ankle_distraction', 'thread_the_needle', 'upper_trap_stretch',
    'thoracic_extension_chair', 'standing_calf_stretch', 'seated_piriformis_stretch'
);
