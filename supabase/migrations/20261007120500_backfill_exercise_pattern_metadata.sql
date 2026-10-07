-- Starter backfill of exercise pattern metadata (spec §6.2 tier a).
-- Partial by design: only unambiguous classifications. The rest is
-- tagged via the admin AI prefill; untagged exercises fall back to
-- BODY_REGION_TO_PATTERN in the generator.

-- === strength_pattern ===

UPDATE exercises SET strength_pattern = 'push_horizontal' WHERE slug IN (
    'bench_press', 'incline_bench_press', 'incline_dumbbell_press',
    'push_up', 'archer_push_up', 'dips'
);

UPDATE exercises SET strength_pattern = 'push_vertical' WHERE slug IN (
    'push_press', 'landmine_press'
);

UPDATE exercises SET strength_pattern = 'pull_vertical' WHERE slug IN (
    'pull_up', 'chin_up', 'weighted_pull_up'
);

UPDATE exercises SET strength_pattern = 'pull_horizontal' WHERE slug IN (
    'dumbbell_row', 'dumbbell_hip_hinge_row'
);

UPDATE exercises SET strength_pattern = 'knee_dominant' WHERE slug IN (
    'back_squat', 'front_squat', 'bulgarian_split_squat', 'split_squat',
    'reverse_lunge', 'pistol_squat', 'assisted_pistol_squat',
    'cossack_squat', 'loaded_cossack_squat', 'atg_split_squat',
    'loaded_atg_split_squat', 'trap_bar_deadlift', 'wall_sit',
    'dumbbell_step_up_to_press'
);

UPDATE exercises SET strength_pattern = 'hinge' WHERE slug IN (
    'romanian_deadlift', 'conventional_deadlift', 'sumo_deadlift',
    'stiff_leg_deadlift', 'hip_thrust', 'single_leg_glute_bridge',
    'nordic_curl', 'nordic_hamstring_curl', 'reverse_hyperextension',
    'back_extension_45deg', 'dumbbell_swing', 'power_clean',
    'hang_power_clean', 'power_snatch', 'hang_power_snatch',
    'dumbbell_snatch', 'dumbbell_clean'
);

UPDATE exercises SET strength_pattern = 'rotation' WHERE slug IN (
    'cable_chop', 'mb_rotational_throw', 'rotational_med_ball_slam',
    -- prod catalog slug variants (seed names mb_* were renamed on prod)
    'rotational_med_ball_throw'
);

-- === core_type ===
-- Core exercises carry core_type instead of strength_pattern (spec §1.3).

UPDATE exercises SET core_type = 'stability' WHERE slug IN (
    'copenhagen_plank', 'renegade_row', 'suitcase_carry'
);

UPDATE exercises SET core_type = 'power' WHERE slug IN (
    'rotational_med_ball_slam', 'medicine_ball_slam'
);

-- === plyo_type ===

UPDATE exercises SET plyo_type = 'maximal' WHERE slug IN (
    'box_jump', 'depth_jump', 'drop_jump', 'broad_jump', 'vertical_jump',
    'single_leg_box_jump', 'jump_squat', 'squat_jump_to_stick',
    'burpee_broad_jump', 'lateral_bounds',
    'mb_chest_throw', 'mb_overhead_throw', 'mb_rotational_throw',
    -- prod catalog slug variants (seed names mb_* were renamed on prod)
    'med_ball_chest_pass', 'med_ball_overhead_throw',
    'rotational_med_ball_throw', 'medicine_ball_slam',
    'clap_push_up'
);

UPDATE exercises SET plyo_type = 'submaximal' WHERE slug IN (
    'pogos', 'hurdle_hops', 'lateral_hurdle_hop',
    'jump_rope_standard', 'jump_rope_double_under', 'star_jump'
);

-- === sprint_type ===
-- Only actual sprint variants; technique drills (a_skip_drill etc.)
-- stay untagged — they live in warmups, not sprint main parts.

UPDATE exercises SET sprint_type = 'acceleration' WHERE slug IN (
    'sprint_10m', 'sprint_30m', 'acceleration_sprint_10m',
    'sprint_start_blocks', 'stair_sprint'
);

UPDATE exercises SET sprint_type = 'max_velocity' WHERE slug IN (
    'sprint_10m_flying', 'flying_20_sprint'
);

UPDATE exercises SET sprint_type = 'resisted' WHERE slug IN (
    'resisted_sprint', 'sprint_parachute_run',
    'banded_sprint_resistance_run', 'sled_push', 'sled_pull',
    'prowler_push_sprint'
);

-- === covered_patterns (compound hybrids, spec §1.3) ===

UPDATE exercises SET covered_patterns = ARRAY['pull_horizontal']::strength_pattern[]
WHERE slug IN ('dumbbell_swing', 'renegade_row');

UPDATE exercises SET covered_patterns = ARRAY['pull_vertical']::strength_pattern[]
WHERE slug IN ('power_clean', 'hang_power_clean', 'power_snatch', 'hang_power_snatch', 'dumbbell_snatch', 'dumbbell_clean');

UPDATE exercises SET covered_patterns = ARRAY['knee_dominant']::strength_pattern[]
WHERE slug IN ('push_press');

UPDATE exercises SET covered_patterns = ARRAY['push_vertical']::strength_pattern[]
WHERE slug IN ('dumbbell_step_up_to_press');
