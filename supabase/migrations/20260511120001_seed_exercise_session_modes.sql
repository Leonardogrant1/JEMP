-- ═════════════════════════════════════════════════════════════
-- Seed: exercise_session_modes
-- Ordnet jeder Übung die Session-Modi zu, in denen sie 
-- verwendet werden darf (many-to-many).
-- ═════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────
-- FULL MODE: alle Übungen außer reine Recovery-Tools
-- ─────────────────────────────────────────────────────────────

INSERT INTO exercise_session_modes (exercise_id, mode_slug)
SELECT ex.id, 'full' FROM exercises ex
WHERE ex.slug NOT IN (
  'diaphragmatic_breathing',
  'box_breathing',
  'yoga_sun_salutation'
)
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- REDUCED MODE: alles außer Heavy Compounds, Max Plyos, 
-- Max Sprints, Olympic Lifts, sehr intensive Conditioning
-- ─────────────────────────────────────────────────────────────

INSERT INTO exercise_session_modes (exercise_id, mode_slug)
SELECT ex.id, 'reduced' FROM exercises ex
WHERE ex.slug NOT IN (
  -- Heavy Compounds
  'back_squat',
  'front_squat',
  'romanian_deadlift',
  'conventional_deadlift',
  'sumo_deadlift',
  'stiff_leg_deadlift',
  'trap_bar_deadlift',
  'bench_press',
  'incline_bench_press',
  'hip_thrust',
  'weighted_pull_up',
  'isometric_mid_thigh_pull',

  -- Olympic Lifts
  'power_clean',
  'hang_power_clean',
  'power_snatch',
  'hang_power_snatch',
  'push_press',
  'dumbbell_snatch',
  'dumbbell_clean',

  -- Max Plyometrics
  'depth_jump',
  'drop_jump',
  'box_jump',
  'single_leg_box_jump',

  -- Max Sprints
  'sprint_30m',
  'sprint_10m_flying',
  'flying_20_sprint',
  'sprint_start_blocks',
  'resisted_sprint',
  'sprint_parachute_run',
  'prowler_push_sprint',

  -- Sehr intensive Conditioning
  'stair_sprint',
  'burpee_broad_jump',

  -- Recovery-only
  'diaphragmatic_breathing',
  'box_breathing',
  'yoga_sun_salutation'
)
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- ACTIVATION MODE: Mobility, Core, leichte Activation Drills
-- ─────────────────────────────────────────────────────────────

INSERT INTO exercise_session_modes (exercise_id, mode_slug)
SELECT ex.id, 'activation' FROM exercises ex
WHERE ex.slug IN (
  -- Mobility
  'worlds_greatest_stretch',
  'hip_cars',
  'shoulder_cars',
  'ankle_cars',
  'banded_ankle_distraction',
  'hip_90_90_stretch',
  'hip_flexor_lunge_stretch',
  'leg_swing_front_to_back',
  'leg_swing_side_to_side',
  'arm_circle',
  'cat_cow_stretch',
  'thread_the_needle',
  'prone_hip_internal_rotation',
  'wrist_mobility_circles',
  'standing_spinal_rotation',
  'neck_circles',

  -- Activation Drills
  'banded_monster_walk',
  'lateral_band_walk',
  'banded_clamshell',
  'fire_hydrant',
  'donkey_kick',
  'standing_hip_abduction',
  'standing_hip_extension',
  'single_leg_glute_bridge',
  'banded_hip_flexor_march',
  'scapular_pull_up',
  'band_pull_apart',
  'banded_face_pull',

  -- Core / Stability
  'dead_bug',
  'bird_dog',
  'hollow_body_hold',
  'superman_hold',
  'copenhagen_plank',
  'spiderman_plank',

  -- Sprint Technique (sehr leicht)
  'a_skip_drill',
  'high_knees',
  'butt_kicks',
  'wall_drill_march',

  -- Leichte Dynamics
  'jumping_jacks',
  'pogos',

  -- Bodyweight Activation
  'bodyweight_squat',
  'sumo_squat',
  'split_squat'
)
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- RECOVERY MODE: nur Mobility, Foam Roll, Stretching, Breathing
-- ─────────────────────────────────────────────────────────────

INSERT INTO exercise_session_modes (exercise_id, mode_slug)
SELECT ex.id, 'recovery' FROM exercises ex
WHERE ex.slug IN (
  -- Foam Rolling
  'thoracic_foam_roll',
  'lat_foam_roll',
  'quad_foam_roll',
  'hamstring_foam_roll',
  'it_band_foam_roll',
  'glute_foam_roll',

  -- Stretching
  'standing_quad_stretch',
  'doorway_chest_stretch',
  'kneeling_adductor_stretch',
  'childs_pose',
  'supine_twist',
  'standing_calf_stretch',
  'seated_piriformis_stretch',
  'upper_trap_stretch',
  'cat_cow_stretch',
  'thread_the_needle',
  'thoracic_extension_chair',
  'neck_circles',
  'wrist_mobility_circles',

  -- Active Mobility (leicht)
  'worlds_greatest_stretch',
  'hip_cars',
  'shoulder_cars',
  'ankle_cars',
  'hip_90_90_stretch',
  'hip_flexor_lunge_stretch',
  'prone_hip_internal_rotation',

  -- Breathing / Restorative
  'diaphragmatic_breathing',
  'box_breathing',
  'yoga_sun_salutation'
)
ON CONFLICT DO NOTHING;


-- ═════════════════════════════════════════════════════════════
-- Sanity Checks (manuell nach dem Seed ausführen)
-- ═════════════════════════════════════════════════════════════

-- Übungen ohne irgendeinen Modus (sollte 0 sein):
-- SELECT slug, name FROM exercises 
-- WHERE id NOT IN (SELECT DISTINCT exercise_id FROM exercise_session_modes);

-- Modi-Verteilung:
-- SELECT mode_slug, COUNT(*) FROM exercise_session_modes GROUP BY mode_slug;