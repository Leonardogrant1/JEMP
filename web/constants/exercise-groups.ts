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
    sled_exercises
};

// ── Reverse map: exercise slug → group name ───────────────────────────────────

export const SLUG_TO_GROUP: Record<string, string> = Object.fromEntries(
    Object.entries(EXERCISE_GROUPS).flatMap(([group, slugs]) =>
        slugs.map(slug => [slug, group])
    )
);
