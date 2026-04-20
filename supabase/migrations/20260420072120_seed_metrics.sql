-- ─────────────────────────────────────────────────────────────
-- Metrics
-- Note: cm-based metrics use unit 'other' (no 'cm' in enum).
--       Values are stored in cm; app layer converts for display.
-- ─────────────────────────────────────────────────────────────

INSERT INTO metrics (slug, unit, higher_is_better) VALUES
    -- Strength: 1RM
    ('back_squat_1rm',          'kg',    true),
    ('hip_thrust_1rm',          'kg',    true),
    ('romanian_deadlift_1rm',   'kg',    true),
    ('bench_press_1rm',         'kg',    true),
    ('weighted_pullups_1rm',    'kg',    true),
    -- Strength: reps
    ('max_pushups',             'count', true),
    ('max_pullups',             'count', true),
    ('max_dips',                'count', true),
    -- Jumps (cm)
    ('vertical_jump_height_cm',    'cm', true),
    ('broad_jump_distance_cm',     'cm', true),
    ('box_jump_height_cm',         'cm', true),
    -- Lower body explosivity (seconds — lower is better)
    ('10m_sprint_time',         's',     false),
    ('30m_sprint_time',         's',     false),
    ('10m_sprint_flying_time',  's',     false),
    ('505_agility_time',        's',     false),
    -- Upper body explosivity (cm + reps)
    ('mb_chest_throw_distance_cm',      'cm', true),
    ('mb_rotational_throw_distance_cm', 'cm', true),
    ('mb_overhead_throw_distance_cm',   'cm', true),
    ('max_clap_pushups',             'count', true);

-- ─────────────────────────────────────────────────────────────
-- Category ↔ Metric mappings
-- ─────────────────────────────────────────────────────────────

INSERT INTO category_metrics (category_id, metric_id)
SELECT c.id, m.id FROM categories c, metrics m WHERE
    c.slug = 'strength' AND m.slug IN (
        'back_squat_1rm', 'hip_thrust_1rm', 'romanian_deadlift_1rm',
        'bench_press_1rm', 'weighted_pullups_1rm',
        'max_pushups', 'max_pullups', 'max_dips'
    );

INSERT INTO category_metrics (category_id, metric_id)
SELECT c.id, m.id FROM categories c, metrics m WHERE
    c.slug = 'jumps' AND m.slug IN (
        'vertical_jump_height_cm', 'broad_jump_distance_cm', 'box_jump_height_cm'
    );

INSERT INTO category_metrics (category_id, metric_id)
SELECT c.id, m.id FROM categories c, metrics m WHERE
    c.slug = 'lower_body_plyometrics' AND m.slug IN (
        '10m_sprint_time', '30m_sprint_time',
        '10m_sprint_flying_time', '505_agility_time'
    );

INSERT INTO category_metrics (category_id, metric_id)
SELECT c.id, m.id FROM categories c, metrics m WHERE
    c.slug = 'upper_body_plyometrics' AND m.slug IN (
        'mb_chest_throw_distance_cm', 'mb_rotational_throw_distance_cm',
        'mb_overhead_throw_distance_cm', 'max_clap_pushups'
    );
