-- ─────────────────────────────────────────────────────────────
-- Seed: tag exercises with environment restrictions
-- Only exercises that cannot be done in certain environments are listed here.
-- Exercises with no rows here = available everywhere.
-- ─────────────────────────────────────────────────────────────

-- ── Outdoor-only exercises ────────────────────────────────────
-- These require open space and cannot be replicated in a gym or home.

INSERT INTO exercise_environments (exercise_id, environment_id)
SELECT e.id, env.id
FROM exercises e, environments env
WHERE env.slug = 'outdoor'
  AND e.slug IN (
    'sprint_10m',
    'sprint_30m',
    'sprint_10m_flying',
    'sprint_parachute_run',
    'flying_20_sprint',
    'acceleration_sprint_10m',
    'stair_sprint',
    'resisted_sprint',
    'banded_sprint_resistance_run',
    'agility_505',
    'pro_agility_shuttle',
    't_drill',
    'sprint_start_blocks'
  )
ON CONFLICT DO NOTHING;

-- ── Gym-only exercises ────────────────────────────────────────
-- These require fixed gym infrastructure (power rack, cable machines,
-- reverse hyper bench, 45° back extension bench, sled track).

INSERT INTO exercise_environments (exercise_id, environment_id)
SELECT e.id, env.id
FROM exercises e, environments env
WHERE env.slug = 'gym'
  AND e.slug IN (
    -- Sled / prowler
    'sled_push',
    'sled_pull',
    'prowler_push_sprint',
    -- Olympic lifts (need platform + bumper plates)
    'power_clean',
    'hang_power_clean',
    'power_snatch',
    'hang_power_snatch',
    -- Cable / machines
    'cable_chop',
    'isometric_mid_thigh_pull',
    -- Speciality benches
    'reverse_hyperextension',
    'back_extension_45deg',
    -- Trap bar
    'trap_bar_deadlift',
    -- Barbell rack exercises
    'back_squat',
    'front_squat',
    'bench_press',
    'incline_bench_press',
    'hip_thrust',
    'bulgarian_split_squat',
    'weighted_pull_up',
    'incline_dumbbell_press',
    'push_press',
    'sumo_deadlift',
    'conventional_deadlift',
    'stiff_leg_deadlift',
    'landmine_press',
    -- Agility equipment
    'hurdle_hops',
    'lateral_hurdle_hop',
    'drop_jump',
    'agility_ladder_ickey_shuffle',
    'agility_ladder_single_leg_hops',
    -- Core machines
    'hanging_leg_raise',
    'ab_wheel_rollout',
    -- Carries (need heavy dumbbells / kettlebells)
    'farmers_walk',
    'suitcase_carry',
    -- Injury prevention (need partner / bench setup)
    'nordic_hamstring_curl',
    'copenhagen_plank',
    'copenhagen_hip_adduction'
  )
ON CONFLICT DO NOTHING;

-- ── Home exercises ────────────────────────────────────────────
-- Bodyweight, band, dumbbell, foam roller and medicine ball exercises
-- that can be done at home without fixed gym infrastructure.

INSERT INTO exercise_environments (exercise_id, environment_id)
SELECT e.id, env.id
FROM exercises e, environments env
WHERE env.slug = 'home'
  AND e.slug IN (
    -- Bodyweight strength
    'push_up',
    'wide_grip_push_up',
    'diamond_push_up',
    'decline_push_up',
    'archer_push_up',
    'pike_push_up',
    'shoulder_tap_push_up',
    'clap_push_up',
    'pull_up',
    'chin_up',
    'negative_pull_up',
    'scapular_pull_up',
    'dips',
    'tricep_dip',
    'bodyweight_squat',
    'split_squat',
    'walking_lunge',
    'reverse_lunge',
    'lateral_lunge',
    'sumo_squat',
    'pistol_squat',
    'assisted_pistol_squat',
    'single_leg_glute_bridge',
    'wall_supported_hamstring_curl',
    'nordic_curl',
    'single_leg_calf_raise',
    'calf_raise_bilateral',
    'tibialis_raise',
    'wall_sit',
    'donkey_kick',
    'fire_hydrant',
    'standing_hip_abduction',
    'standing_hip_extension',
    -- Core bodyweight
    'dead_bug',
    'bird_dog',
    'hollow_body_hold',
    'v_up',
    'reverse_crunch',
    'bicycle_crunch',
    'superman_hold',
    'mountain_climber',
    'spiderman_plank',
    'toe_touch_crunch',
    -- Resistance band
    'banded_squat',
    'banded_hip_thrust',
    'banded_romanian_deadlift',
    'banded_row',
    'banded_overhead_press',
    'banded_lateral_raise',
    'banded_good_morning',
    'banded_face_pull',
    'banded_kickback',
    'banded_bicycle',
    'banded_chest_press_floor',
    'banded_monster_walk',
    'lateral_band_walk',
    'banded_clamshell',
    'banded_ankle_distraction',
    'banded_hip_flexor_march',
    'banded_sprint_resistance_run',
    'band_pull_apart',
    -- Dumbbell
    'dumbbell_rdl',
    'dumbbell_row',
    'dumbbell_floor_press',
    'dumbbell_lateral_lunge',
    'dumbbell_goblet_reverse_lunge',
    'dumbbell_step_up_to_press',
    'dumbbell_curl_to_press',
    'dumbbell_thruster',
    'dumbbell_hip_hinge_row',
    'renegade_row',
    'dumbbell_snatch',
    'dumbbell_clean',
    'dumbbell_swing',
    'romanian_deadlift',
    -- Medicine ball
    'mb_chest_throw',
    'mb_overhead_throw',
    'mb_rotational_throw',
    'medicine_ball_slam',
    'rotational_med_ball_throw',
    'med_ball_chest_pass',
    'med_ball_overhead_throw',
    'med_ball_scoop_toss',
    -- Plyometrics (no equipment needed)
    'jump_squat',
    'squat_jump_to_stick',
    'broad_jump',
    'vertical_jump',
    'box_jump',
    'single_leg_box_jump',
    'depth_jump',
    'lateral_bounds',
    'pogos',
    'burpee',
    'burpee_broad_jump',
    'star_jump',
    'jumping_jacks',
    'jump_rope_standard',
    'jump_rope_double_under',
    -- Conditioning / drills
    'high_knees',
    'butt_kicks',
    'sprint_in_place',
    'a_skip_drill',
    'b_skip_drill',
    'wall_drill_march',
    'bear_crawl',
    'lateral_shuffle',
    'shadow_boxing',
    'reactive_drop_catch',
    -- Foam roller
    'thoracic_foam_roll',
    'lat_foam_roll',
    'quad_foam_roll',
    'hamstring_foam_roll',
    'it_band_foam_roll',
    'glute_foam_roll',
    -- Mobility
    'worlds_greatest_stretch',
    'hip_cars',
    'shoulder_cars',
    'ankle_cars',
    'hip_90_90_stretch',
    'hip_flexor_lunge_stretch',
    'leg_swing_front_to_back',
    'leg_swing_side_to_side',
    'arm_circle',
    'standing_quad_stretch',
    'kneeling_adductor_stretch',
    'doorway_chest_stretch',
    'childs_pose',
    'supine_twist',
    'diaphragmatic_breathing',
    'box_breathing',
    'yoga_sun_salutation',
    'cat_cow_stretch',
    'thread_the_needle',
    'prone_hip_internal_rotation',
    'standing_calf_stretch',
    'seated_piriformis_stretch',
    'upper_trap_stretch',
    'wrist_mobility_circles',
    'thoracic_extension_chair',
    'standing_spinal_rotation',
    'neck_circles'
  )
ON CONFLICT DO NOTHING;