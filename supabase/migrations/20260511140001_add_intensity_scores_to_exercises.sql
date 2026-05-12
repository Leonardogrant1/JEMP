-- ─────────────────────────────────────────────────────────────
-- Intensity 1: Restorative, Breathing, sehr leichte Mobility
-- ─────────────────────────────────────────────────────────────
UPDATE exercises SET intensity_score = 1 WHERE slug IN (
  'diaphragmatic_breathing', 'box_breathing', 'childs_pose',
  'supine_twist', 'cat_cow_stretch', 'neck_circles',
  'upper_trap_stretch', 'wrist_mobility_circles', 'arm_circle',
  'ankle_cars', 'standing_quad_stretch', 'standing_calf_stretch',
  'doorway_chest_stretch', 'seated_piriformis_stretch'
);


-- ─────────────────────────────────────────────────────────────
-- Intensity 2: Mobility, Foam Roll, leichtes Stretching
-- ─────────────────────────────────────────────────────────────
UPDATE exercises SET intensity_score = 2 WHERE slug IN (
  'hip_cars', 'shoulder_cars', 'thoracic_foam_roll', 'lat_foam_roll',
  'quad_foam_roll', 'hamstring_foam_roll', 'it_band_foam_roll',
  'glute_foam_roll', 'hip_90_90_stretch', 'hip_flexor_lunge_stretch',
  'kneeling_adductor_stretch', 'thread_the_needle', 'banded_ankle_distraction',
  'prone_hip_internal_rotation', 'thoracic_extension_chair', 
  'standing_spinal_rotation', 'yoga_sun_salutation', 'worlds_greatest_stretch',
  'leg_swing_front_to_back', 'leg_swing_side_to_side'
);


-- ─────────────────────────────────────────────────────────────
-- Intensity 3: Light Activation, leichte Mobility-Drills
-- ─────────────────────────────────────────────────────────────
UPDATE exercises SET intensity_score = 3 WHERE slug IN (
  'banded_clamshell', 'fire_hydrant', 'donkey_kick',
  'standing_hip_abduction', 'standing_hip_extension',
  'lateral_band_walk', 'banded_monster_walk', 'banded_kickback',
  'banded_face_pull', 'band_pull_apart', 'scapular_pull_up',
  'wall_drill_march', 'banded_hip_flexor_march'
);


-- ─────────────────────────────────────────────────────────────
-- Intensity 4: Light Strength, Core, leichte Bodyweight
-- ─────────────────────────────────────────────────────────────
UPDATE exercises SET intensity_score = 4 WHERE slug IN (
  'bodyweight_squat', 'split_squat', 'sumo_squat',
  'wall_sit', 'dead_bug', 'bird_dog', 'superman_hold',
  'single_leg_glute_bridge', 'jumping_jacks', 'high_knees', 
  'butt_kicks', 'a_skip_drill', 'jump_rope_standard',
  'reverse_crunch', 'bicycle_crunch', 'toe_touch_crunch',
  'mountain_climber', 'walking_lunge', 'reverse_lunge',
  'tibialis_raise', 'single_leg_calf_raise', 'calf_raise_bilateral',
  'banded_squat', 'banded_good_morning', 'banded_bicycle',
  'push_up', 'negative_pull_up'
);


-- ─────────────────────────────────────────────────────────────
-- Intensity 5: Moderate Strength, Core, leichte Plyos
-- ─────────────────────────────────────────────────────────────
UPDATE exercises SET intensity_score = 5 WHERE slug IN (
  'pogos', 'b_skip_drill', 'star_jump', 'sprint_in_place',
  'bear_crawl', 'lateral_shuffle', 'shadow_boxing',
  'agility_ladder_ickey_shuffle', 'wide_grip_push_up',
  'diamond_push_up', 'decline_push_up', 'shoulder_tap_push_up',
  'pike_push_up', 'tricep_dip', 'hollow_body_hold',
  'copenhagen_plank', 'spiderman_plank', 'dumbbell_floor_press',
  'dumbbell_rdl', 'dumbbell_row', 'banded_chest_press_floor',
  'banded_row', 'banded_overhead_press', 'banded_lateral_raise',
  'banded_hip_thrust', 'banded_romanian_deadlift'
);


-- ─────────────────────────────────────────────────────────────
-- Intensity 6: Moderate-Heavy Strength, mittlere Plyos, Bodyweight-Pulls
-- ─────────────────────────────────────────────────────────────
UPDATE exercises SET intensity_score = 6 WHERE slug IN (
  -- Bodyweight Pull/Push (von 7 runter)
  'pull_up', 'chin_up', 'dips',
  
  -- Moderate Strength
  'lateral_lunge', 'dumbbell_lateral_lunge', 'dumbbell_goblet_reverse_lunge',
  'dumbbell_step_up_to_press', 'dumbbell_curl_to_press', 'dumbbell_thruster',
  'dumbbell_swing', 'hanging_leg_raise', 'ab_wheel_rollout',
  'farmers_walk', 'suitcase_carry', 'cable_chop',
  'wall_supported_hamstring_curl', 'reverse_hyperextension', 
  'back_extension_45deg', 'copenhagen_hip_adduction',
  
  -- Mittlere Plyos / Power
  'broad_jump', 'vertical_jump', 'lateral_bounds', 'lateral_hurdle_hop',
  'jump_squat', 'squat_jump_to_stick', 'burpee',
  'agility_ladder_single_leg_hops', 'jump_rope_double_under',
  
  -- Med Ball Power
  'mb_chest_throw', 'mb_overhead_throw', 'mb_rotational_throw',
  'med_ball_chest_pass', 'med_ball_overhead_throw', 'med_ball_scoop_toss',
  'medicine_ball_slam', 'rotational_med_ball_throw'
);


-- ─────────────────────────────────────────────────────────────
-- Intensity 7: Heavy Strength, intensive Plyos, Acceleration Sprints
-- ─────────────────────────────────────────────────────────────
UPDATE exercises SET intensity_score = 7 WHERE slug IN (
  -- Heavy Strength / Loaded Compounds
  'bulgarian_split_squat', 'incline_dumbbell_press', 'landmine_press',
  'renegade_row', 'dumbbell_hip_hinge_row',
  
  -- Schwierige Bodyweight
  'archer_push_up', 'pistol_squat', 'assisted_pistol_squat', 'v_up',
  'clap_push_up',
  
  -- Intensive Plyos
  'hurdle_hops', 'box_jump',
  
  -- Acceleration Sprints (von 6 hoch)
  'sprint_10m', 'acceleration_sprint_10m',
  
  -- Reactive Drills
  'reactive_drop_catch',
  
  -- Resisted Bodyweight Sprint (Band)
  'banded_sprint_resistance_run'
);


-- ─────────────────────────────────────────────────────────────
-- Intensity 8: Heavy Compounds, Max-Intensity Plyos, COD-Drills
-- ─────────────────────────────────────────────────────────────
UPDATE exercises SET intensity_score = 8 WHERE slug IN (
  -- Heavy Barbell Compounds
  'back_squat', 'front_squat', 'bench_press', 'incline_bench_press',
  'hip_thrust', 'romanian_deadlift', 'stiff_leg_deadlift', 'sumo_deadlift',
  'trap_bar_deadlift', 'weighted_pull_up',
  
  -- Eccentric Hamstring
  'nordic_curl', 'nordic_hamstring_curl',
  
  -- Max Sprints
  'sprint_30m', 'sprint_10m_flying',
  
  -- Unilaterale Plyos
  'single_leg_box_jump',
  
  -- Sled Work
  'sled_push', 'sled_pull',
  
  -- COD-Drills (von 7 hoch - Max-Effort mit hartem Stop)
  'agility_505', 't_drill', 'pro_agility_shuttle',
  
  -- Hochintensives Conditioning (von 7 hoch)
  'burpee_broad_jump', 'stair_sprint'
);


-- ─────────────────────────────────────────────────────────────
-- Intensity 9: Max-Effort, Olympic Lifts, Reactive Plyos
-- ─────────────────────────────────────────────────────────────
UPDATE exercises SET intensity_score = 9 WHERE slug IN (
  -- Olympic Lifts
  'conventional_deadlift', 'power_clean', 'hang_power_clean',
  'power_snatch', 'hang_power_snatch', 'push_press',
  'dumbbell_snatch', 'dumbbell_clean',
  
  -- Reactive Plyos
  'depth_jump',
  
  -- Max Sprints (with resistance / blocks)
  'flying_20_sprint', 'sprint_start_blocks', 'resisted_sprint',
  'sprint_parachute_run', 'prowler_push_sprint',
  
  -- Max Isometric
  'isometric_mid_thigh_pull'
);


-- ─────────────────────────────────────────────────────────────
-- Intensity 10: ZNS-Spitze (reaktive Plyos aus großer Höhe)
-- ─────────────────────────────────────────────────────────────
UPDATE exercises SET intensity_score = 10 WHERE slug IN (
  'drop_jump'
);


-- ═════════════════════════════════════════════════════════════
-- Sanity Checks
-- ═════════════════════════════════════════════════════════════

-- Übungen ohne Score (sollte 0 sein):
-- SELECT slug, name FROM exercises WHERE intensity_score IS NULL;

-- Verteilung anschauen:
-- SELECT intensity_score, COUNT(*) FROM exercises 
-- GROUP BY intensity_score ORDER BY intensity_score;


 
-- ─────────────────────────────────────────────────────────────
-- BREATHING: nur Atemübungen
-- ─────────────────────────────────────────────────────────────
UPDATE exercises SET exercise_type = 'breathing' WHERE slug IN (
  'diaphragmatic_breathing',
  'box_breathing'
);


-- ─────────────────────────────────────────────────────────────
-- RESTORATIVE: passive Stretches, Foam Rolls, sehr ruhige Mobility
-- ─────────────────────────────────────────────────────────────
UPDATE exercises SET exercise_type = 'restorative' WHERE slug IN (
  -- Foam Rolling
  'thoracic_foam_roll', 'lat_foam_roll', 'quad_foam_roll',
  'hamstring_foam_roll', 'it_band_foam_roll', 'glute_foam_roll',
  
  -- Statische Stretches
  'standing_quad_stretch', 'standing_calf_stretch', 'doorway_chest_stretch',
  'seated_piriformis_stretch', 'kneeling_adductor_stretch',
  'hip_flexor_lunge_stretch', 'hip_90_90_stretch', 'upper_trap_stretch',
  
  -- Ruhige Postures
  'childs_pose', 'supine_twist', 'thread_the_needle',
  'cat_cow_stretch', 'thoracic_extension_chair', 'yoga_sun_salutation',
  
  -- Passive Mobilization
  'banded_ankle_distraction', 'prone_hip_internal_rotation'
);


-- ─────────────────────────────────────────────────────────────
-- DYNAMIC: alles andere (Standard)
-- ─────────────────────────────────────────────────────────────
UPDATE exercises SET exercise_type = 'dynamic' 
WHERE exercise_type IS NULL;