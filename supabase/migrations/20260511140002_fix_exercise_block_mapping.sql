-- ═════════════════════════════════════════════════════════════
-- Migration: exercise_blocks komplett neu zuordnen
-- 
-- Strategie: 
-- 1. Komplett leeren
-- 2. Sauber neu zuordnen basierend auf 
--    intensity_score + exercise_type + Übungs-Charakter
-- ═════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────
-- 1. Alle bestehenden Zuordnungen löschen
-- ─────────────────────────────────────────────────────────────

TRUNCATE TABLE exercise_blocks;


-- ─────────────────────────────────────────────────────────────
-- 2. WARMUP-Block
-- 
-- Regel: Dynamic-Übungen mit intensity ≤ 5
-- Zweck: Dynamische Mobility, Activation, Movement Prep
-- ─────────────────────────────────────────────────────────────

INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, (SELECT id FROM block_types WHERE slug = 'warmup')
FROM exercises ex
WHERE ex.slug IN (
  -- Dynamische Mobility
  'worlds_greatest_stretch',
  'hip_cars', 'shoulder_cars', 'ankle_cars',
  'leg_swing_front_to_back', 'leg_swing_side_to_side',
  'arm_circle', 'cat_cow_stretch', 'thread_the_needle',
  'standing_spinal_rotation', 'banded_ankle_distraction',
  'prone_hip_internal_rotation', 'wrist_mobility_circles',
  
  -- Sprint Technique / Movement Prep
  'a_skip_drill', 'b_skip_drill', 'high_knees', 'butt_kicks',
  'wall_drill_march', 'jumping_jacks', 'jump_rope_standard',
  'sprint_in_place',
  
  -- Activation Drills
  'banded_monster_walk', 'lateral_band_walk', 'banded_clamshell',
  'fire_hydrant', 'donkey_kick',
  'standing_hip_abduction', 'standing_hip_extension',
  'single_leg_glute_bridge', 'banded_hip_flexor_march',
  'scapular_pull_up', 'band_pull_apart', 'banded_face_pull',
  'banded_kickback', 'banded_good_morning',
  
  -- Light Movement Prep
  'bodyweight_squat', 'sumo_squat', 'split_squat',
  'walking_lunge', 'lateral_lunge', 'reverse_lunge',
  'calf_raise_bilateral', 'tibialis_raise',
  'banded_squat',
  
  -- Light Plyos (für Activation/Prep)
  'pogos', 'star_jump',
  
  -- Foundational Drills
  'mountain_climber', 'bear_crawl', 'lateral_shuffle',
  'agility_ladder_ickey_shuffle'
);


-- ─────────────────────────────────────────────────────────────
-- 3. PRIMARY-Block
-- 
-- Regel: Hauptreiz-Übungen mit intensity ≥ 6
-- Zweck: Schwerste Übungen der Session
-- ─────────────────────────────────────────────────────────────

INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, (SELECT id FROM block_types WHERE slug = 'primary')
FROM exercises ex
WHERE ex.slug IN (
  -- Heavy Strength (Barbell)
  'back_squat', 'front_squat', 'romanian_deadlift', 'hip_thrust',
  'bench_press', 'incline_bench_press',
  'conventional_deadlift', 'sumo_deadlift', 'stiff_leg_deadlift',
  'trap_bar_deadlift', 'weighted_pull_up',
  
  -- Olympic Lifts
  'power_clean', 'hang_power_clean',
  'power_snatch', 'hang_power_snatch', 'push_press',
  'dumbbell_snatch', 'dumbbell_clean',
  
  -- Bodyweight Compounds
  'pull_up', 'chin_up', 'dips',
  'bulgarian_split_squat', 'pistol_squat', 'assisted_pistol_squat',
  
  -- Eccentric Strength
  'nordic_curl', 'nordic_hamstring_curl',
  
  -- Max Plyos
  'depth_jump', 'drop_jump',
  'box_jump', 'broad_jump', 'vertical_jump',
  'single_leg_box_jump', 'squat_jump_to_stick', 'jump_squat',
  'hurdle_hops', 'lateral_bounds', 'lateral_hurdle_hop',
  
  -- Sprints / COD
  'sprint_10m', 'sprint_30m', 'sprint_10m_flying',
  'acceleration_sprint_10m', 'flying_20_sprint',
  'sprint_start_blocks',
  'agility_505', 't_drill', 'pro_agility_shuttle',
  
  -- Resisted Sprints
  'resisted_sprint', 'sprint_parachute_run',
  'banded_sprint_resistance_run',
  'sled_push', 'sled_pull', 'prowler_push_sprint',
  
  -- Isometric Max
  'isometric_mid_thigh_pull',
  
  -- Upper Body Power
  'mb_chest_throw', 'mb_overhead_throw', 'mb_rotational_throw',
  'med_ball_chest_pass', 'med_ball_overhead_throw',
  'med_ball_scoop_toss', 'medicine_ball_slam',
  'rotational_med_ball_throw', 'clap_push_up',
  
  -- Loaded Compound Variations
  'incline_dumbbell_press', 'landmine_press',
  'dumbbell_thruster', 'dumbbell_rdl',
  'renegade_row',
  
  -- Hochintensives Conditioning
  'burpee_broad_jump', 'stair_sprint',
  
  -- Reactive Drills
  'reactive_drop_catch'
);


-- ─────────────────────────────────────────────────────────────
-- 4. SECONDARY-Block
-- 
-- Regel: Wie primary, dieselben Übungen
-- Zweck: Komplementärer Reiz nach primary
-- ─────────────────────────────────────────────────────────────

INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, (SELECT id FROM block_types WHERE slug = 'secondary')
FROM exercises ex
JOIN exercise_blocks eb ON eb.exercise_id = ex.id
WHERE eb.block_type_id = (SELECT id FROM block_types WHERE slug = 'primary');

-- Zusätzlich für secondary erlaubt: mittlere Übungen die zu sportartspezifisch 
-- für Hauptreiz sind, aber als secondary passen
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, (SELECT id FROM block_types WHERE slug = 'secondary')
FROM exercises ex
WHERE ex.slug IN (
  'push_up', 'jump_rope_double_under', 'burpee',
  'dumbbell_swing', 'shadow_boxing',
  'agility_ladder_single_leg_hops'
);


-- ─────────────────────────────────────────────────────────────
-- 5. ACCESSORY-Block
-- 
-- Regel: Dynamic mit intensity 3-7, Strength/Core/Stability
-- Zweck: Schwächen, Injury Prevention, Core, Unilateral
-- ─────────────────────────────────────────────────────────────

INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, (SELECT id FROM block_types WHERE slug = 'accessory')
FROM exercises ex
WHERE ex.slug IN (
  -- Lower Body Accessories
  'reverse_lunge', 'walking_lunge', 'lateral_lunge', 'split_squat',
  'bulgarian_split_squat',
  'dumbbell_lateral_lunge', 'dumbbell_goblet_reverse_lunge',
  'dumbbell_step_up_to_press',
  'single_leg_calf_raise', 'calf_raise_bilateral', 'tibialis_raise',
  'wall_sit',
  
  -- Glutes / Hip
  'single_leg_glute_bridge', 'banded_hip_thrust',
  'banded_kickback', 'donkey_kick', 'fire_hydrant',
  'standing_hip_abduction', 'standing_hip_extension',
  'reverse_hyperextension', 'back_extension_45deg',
  
  -- Hamstring
  'nordic_curl', 'nordic_hamstring_curl',
  'wall_supported_hamstring_curl', 'banded_romanian_deadlift',
  'dumbbell_rdl', 'banded_good_morning',
  
  -- Core / Stability
  'dead_bug', 'bird_dog', 'hollow_body_hold', 'superman_hold',
  'plank' /* falls vorhanden */, 'spiderman_plank',
  'copenhagen_plank', 'copenhagen_hip_adduction',
  'ab_wheel_rollout', 'cable_chop',
  'v_up', 'reverse_crunch', 'bicycle_crunch', 'toe_touch_crunch',
  'hanging_leg_raise', 'banded_bicycle',
  
  -- Upper Body Accessories
  'push_up', 'wide_grip_push_up', 'diamond_push_up',
  'decline_push_up', 'archer_push_up',
  'pike_push_up', 'shoulder_tap_push_up',
  'tricep_dip', 'negative_pull_up',
  'dumbbell_row', 'dumbbell_hip_hinge_row',
  'banded_row', 'banded_overhead_press', 'banded_lateral_raise',
  'banded_chest_press_floor', 'dumbbell_curl_to_press',
  'dumbbell_floor_press', 'incline_dumbbell_press', 'landmine_press',
  'renegade_row',
  
  -- Shoulder Health / Posture
  'band_pull_apart', 'scapular_pull_up', 'banded_face_pull',
  
  -- Activation
  'banded_monster_walk', 'lateral_band_walk', 'banded_clamshell',
  'banded_hip_flexor_march',
  
  -- Carries
  'farmers_walk', 'suitcase_carry',
  
  -- Squat Variations (light)
  'bodyweight_squat', 'sumo_squat', 'banded_squat'
);


-- ─────────────────────────────────────────────────────────────
-- 6. COOLDOWN-Block
-- 
-- Regel: Restorative-Übungen ODER intensity ≤ 2
-- Zweck: Recovery, Mobility, Längenwiederherstellung
-- ─────────────────────────────────────────────────────────────

INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, (SELECT id FROM block_types WHERE slug = 'cooldown')
FROM exercises ex
WHERE ex.slug IN (
  -- Foam Rolling
  'thoracic_foam_roll', 'lat_foam_roll', 'quad_foam_roll',
  'hamstring_foam_roll', 'it_band_foam_roll', 'glute_foam_roll',
  
  -- Static Stretches
  'standing_quad_stretch', 'standing_calf_stretch',
  'doorway_chest_stretch', 'kneeling_adductor_stretch',
  'hip_flexor_lunge_stretch', 'hip_90_90_stretch',
  'seated_piriformis_stretch', 'upper_trap_stretch',
  
  -- Ruhige Mobility
  'childs_pose', 'supine_twist', 'thread_the_needle',
  'cat_cow_stretch', 'thoracic_extension_chair',
  'yoga_sun_salutation',
  
  -- CARs (sehr ruhig)
  'hip_cars', 'shoulder_cars', 'ankle_cars',
  
  -- Active Mobility (leicht)
  'worlds_greatest_stretch',
  'prone_hip_internal_rotation',
  'banded_ankle_distraction',
  'neck_circles', 'wrist_mobility_circles',
  'standing_spinal_rotation',
  
  -- Breathing
  'diaphragmatic_breathing', 'box_breathing'
);


-- ═════════════════════════════════════════════════════════════
-- Sanity Checks (nach der Migration ausführen)
-- ═════════════════════════════════════════════════════════════

-- 1. Übungen ohne Block-Zuordnung (sollte 0 sein):
-- SELECT slug, name, intensity_score, exercise_type 
-- FROM exercises 
-- WHERE id NOT IN (SELECT DISTINCT exercise_id FROM exercise_blocks);

-- 2. Cooldown-Inhalt prüfen (sollte nur restorative oder intensity ≤ 2 sein):
-- SELECT e.slug, e.intensity_score, e.exercise_type
-- FROM exercises e
-- JOIN exercise_blocks eb ON eb.exercise_id = e.id
-- JOIN block_types bt ON bt.id = eb.block_type_id
-- WHERE bt.slug = 'cooldown'
-- AND (e.exercise_type = 'dynamic' AND e.intensity_score > 2);
-- ↑ sollte 0 Zeilen liefern

-- 3. Verteilung pro Block:
-- SELECT bt.slug, COUNT(*) 
-- FROM exercise_blocks eb 
-- JOIN block_types bt ON bt.id = eb.block_type_id 
-- GROUP BY bt.slug 
-- ORDER BY bt.slug;