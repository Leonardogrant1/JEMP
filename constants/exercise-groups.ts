// ── Strength ──────────────────────────────────────────────────────────────────

const squat_patterns = [
    'back_squat', 'front_squat', 'bulgarian_split_squat', 'pistol_squat',
];

const hip_hinge = [
    'conventional_deadlift', 'sumo_deadlift', 'trap_bar_deadlift', 'romanian_deadlift',
    'nordic_curl', 'nordic_hamstring_curl',
];

const hip_thrust = [
    'hip_thrust', 'banded_hip_thrust',
];

const upper_push = [
    'bench_press', 'incline_bench_press', 'push_up', 'dips', 'tricep_dip', 'push_press',
];

const upper_pull = [
    'pull_up', 'chin_up', 'weighted_pull_up',
];

const olympic_lifts = [
    'power_clean', 'hang_power_clean', 'power_snatch', 'hang_power_snatch',
];

const dumbbell_complex = [
    'dumbbell_thruster', 'dumbbell_snatch', 'dumbbell_clean', 'dumbbell_swing',
];

const loaded_carry = [
    'farmers_walk', 'isometric_mid_thigh_pull',
];

// ── Jump Power ────────────────────────────────────────────────────────────────

const vertical_jumps = [
    'box_jump', 'depth_jump', 'drop_jump', 'vertical_jump', 'single_leg_box_jump',
    'jump_squat', 'squat_jump_to_stick',
];

const horizontal_jumps = [
    'broad_jump', 'lateral_bounds', 'lateral_hurdle_hop',
];

const hurdle_hops = [
    'hurdle_hops',
];

const reactive_jumps = [
    'pogos',
];

// ── Lower Body Explosivity ────────────────────────────────────────────────────

const sprints = [
    'sprint_10m', 'sprint_30m', 'sprint_10m_flying', 'flying_20_sprint',
    'resisted_sprint', 'sprint_parachute_run', 'sprint_start_blocks',
    'acceleration_sprint_10m', 'banded_sprint_resistance_run', 'sprint_in_place',
    'stair_sprint', 'prowler_push_sprint'   
];

const sled_exercises = [
    'sled_push', 'sled_pull',
]

const agility = [
    'agility_505', 'pro_agility_shuttle', 't_drill', 'agility_ladder_ickey_shuffle',
    'agility_ladder_single_leg_hops', 'lateral_shuffle',
];

const conditioning = [
    'burpee', 'burpee_broad_jump', 'bear_crawl', 'star_jump',
    'jump_rope_double_under', 'mountain_climber', 'shadow_boxing',
];

// ── Upper Body Explosivity ────────────────────────────────────────────────────

const medicine_ball = [
    'mb_chest_throw', 'mb_overhead_throw', 'mb_rotational_throw', 'medicine_ball_slam',
    'rotational_med_ball_throw', 'med_ball_chest_pass', 'med_ball_overhead_throw',
    'med_ball_scoop_toss',
];

const explosive_push = [
    'clap_push_up',
];

const lunges = [
    'reverse_lunge', 'walking_lunge', 'lateral_lunge',
    'dumbbell_lateral_lunge', 'dumbbell_goblet_reverse_lunge', 'dumbbell_step_up_to_press',
];

const glute_hip_activation = [
    'single_leg_glute_bridge', 'banded_monster_walk', 'lateral_band_walk',
    'banded_clamshell', 'donkey_kick', 'fire_hydrant',
    'standing_hip_abduction', 'standing_hip_extension', 'banded_kickback',
];

const posterior_chain_iso = [
    'reverse_hyperextension', 'back_extension_45deg', 'superman_hold',
];

const calf_ankle = [
    'single_leg_calf_raise', 'tibialis_raise', 'calf_raise_bilateral',
];

const core = [
    'dead_bug', 'bird_dog', 'ab_wheel_rollout', 'cable_chop',
    'hanging_leg_raise', 'hollow_body_hold', 'v_up', 'reverse_crunch',
    'bicycle_crunch', 'spiderman_plank', 'toe_touch_crunch', 'banded_bicycle',
];

const adductor = [
    'copenhagen_plank', 'copenhagen_hip_adduction',
];

const sprint_drills = [
    'a_skip_drill', 'b_skip_drill', 'high_knees', 'butt_kicks',
    'wall_drill_march', 'banded_hip_flexor_march',
];

const mobility_development = [
    'cossack_squat', 'loaded_cossack_squat',
    'atg_split_squat', 'loaded_atg_split_squat',
    'deep_squat_hold', 'loaded_deep_squat_hold',
    'bodyweight_good_morning', 'loaded_good_morning',
    'segmental_spinal_roll', 'jefferson_curl',
    'tempo_hip_cars', 'resisted_hip_cars',
    'deep_lunge_rotation', 'loaded_deep_lunge_rotation',
    'dowel_overhead_squat', 'overhead_squat_loaded',
    'hip_flexion_lift_off', 'sots_press',
];

const mobility = [
   "glute_foam_roll",
   "yoga_sun_salutation",
   "shoulder_cars",
   "wrist_mobility_circles",
   "worlds_greatest_stretch",
   "standing_spinal_rotation",
   "prone_hip_internal_rotation",
   "hip_90_90_stretch",
   "leg_swing_side_to_side",
   "ankle_cars",
   "hip_flexor_lunge_stretch",
   "hip_cars",
   "leg_swing_front_to_back",
   "supine_twist",
    "thoracic_foam_roll",
    "arm_circle",
   "quad_foam_roll",
    "lat_foam_roll"  ,
    "kneeling_adductor_stretch",
    "it_band_foam_roll",
    "hamstring_foam_roll",
    "diaphragmatic_breathing",
    "cat_cow_stretch", 
    "childs_pose",
    "doorway_chest_stretch",
   "box_breathing",
   "standing_quad_stretch",
   "banded_ankle_distraction",
   "thread_the_needle",
   "upper_trap_stretch",
   "thoracic_extension_chair",
   "standing_calf_stretch",
   "seated_piriformis_stretch"  
];

// ── Map: group name → slug array ──────────────────────────────────────────────

export const EXERCISE_GROUPS: Record<string, string[]> = {
    squat_patterns,
    hip_hinge,
    hip_thrust,
    upper_push,
    upper_pull,
    olympic_lifts,
    dumbbell_complex,
    loaded_carry,
    vertical_jumps,
    horizontal_jumps,
    hurdle_hops,
    reactive_jumps,
    sprints,
    agility,
    conditioning,
    medicine_ball,
    explosive_push,
    sled_exercises,
    mobility,
    lunges,
    glute_hip_activation,
    posterior_chain_iso,
    calf_ankle,
    core,
    adductor,
    sprint_drills,
    mobility_development,
};

// ── Reverse map: exercise slug → group name ───────────────────────────────────

export const SLUG_TO_GROUP: Record<string, string> = Object.fromEntries(
    Object.entries(EXERCISE_GROUPS).flatMap(([group, slugs]) =>
        slugs.map(slug => [slug, group])
    )
);
