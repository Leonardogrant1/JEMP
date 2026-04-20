-- ─────────────────────────────────────────────────────────────
-- Environments
-- ─────────────────────────────────────────────────────────────

INSERT INTO environments (slug) VALUES
    ('gym'),
    ('outdoor'),
    ('home')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Equipment
-- ─────────────────────────────────────────────────────────────

INSERT INTO equipments (slug) VALUES
    -- Free weights
    ('barbell'),
    ('dumbbell'),
    ('kettlebell'),
    ('weight_belt'),

    -- Racks / benches
    ('squat_rack'),
    ('bench'),
    ('incline_bench'),

    -- Pull / push stations
    ('pull_up_bar'),
    ('dip_bar'),
    ('cable_machine'),

    -- Plyometrics
    ('plyo_box'),
    ('medicine_ball'),
    ('agility_cones'),

    -- Misc
    ('resistance_band')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Environment ↔ Equipment mappings
-- ─────────────────────────────────────────────────────────────

-- Gym: everything
INSERT INTO environment_equipments (environment_id, equipment_id)
SELECT e.id, eq.id FROM environments e, equipments eq
WHERE e.slug = 'gym'
ON CONFLICT DO NOTHING;

-- Outdoor: portable equipment only
INSERT INTO environment_equipments (environment_id, equipment_id)
SELECT e.id, eq.id FROM environments e, equipments eq
WHERE e.slug = 'outdoor'
  AND eq.slug IN (
      'medicine_ball',
      'resistance_band',
      'agility_cones',
      'plyo_box'
  )
ON CONFLICT DO NOTHING;

-- Home: bodyweight-friendly equipment
INSERT INTO environment_equipments (environment_id, equipment_id)
SELECT e.id, eq.id FROM environments e, equipments eq
WHERE e.slug = 'home'
  AND eq.slug IN (
      'pull_up_bar',
      'dip_bar',
      'medicine_ball',
      'resistance_band',
      'weight_belt',
      'kettlebell',
      'dumbbell',
      'plyo_box'
  )
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Block types
-- ─────────────────────────────────────────────────────────────

INSERT INTO block_types (slug) VALUES
    ('warmup'),
    ('activation'),
    ('main'),
    ('accessory'),
    ('cooldown')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Exercises
-- ─────────────────────────────────────────────────────────────

INSERT INTO exercises (name, slug, description, movement_pattern, body_region, category_id, min_level, max_level) VALUES

    -- Strength
    ('Back Squat',            'back_squat',            'Barbell squat with bar on upper back. Primary lower body strength movement.',      'legs',       'quad',        (SELECT id FROM categories WHERE slug = 'strength'), 20, 100),
    ('Front Squat',           'front_squat',           'Barbell squat with bar on front delts. Demands more core and thoracic mobility.',   'legs',       'quad',        (SELECT id FROM categories WHERE slug = 'strength'), 30, 100),
    ('Romanian Deadlift',     'romanian_deadlift',     'Hip hinge with barbell. Primary hamstring and glute strength movement.',            'pull',       'hamstring',   (SELECT id FROM categories WHERE slug = 'strength'), 15, 100),
    ('Hip Thrust',            'hip_thrust',            'Barbell hip extension. Isolates glute strength through full range.',                'push',       'glute',       (SELECT id FROM categories WHERE slug = 'strength'), 10, 100),
    ('Bench Press',           'bench_press',           'Horizontal barbell press. Primary upper body push movement.',                      'push',       'chest',       (SELECT id FROM categories WHERE slug = 'strength'), 15, 100),
    ('Incline Bench Press',   'incline_bench_press',   'Barbell press at 30–45° incline. Targets upper chest and anterior deltoid.',        'push',       'chest',       (SELECT id FROM categories WHERE slug = 'strength'), 20, 100),
    ('Pull-up',               'pull_up',               'Overhand grip pull to bar. Primary vertical pull movement.',                       'pull',       'upper_back',  (SELECT id FROM categories WHERE slug = 'strength'), 20, 100),
    ('Chin-up',               'chin_up',               'Underhand grip pull to bar. More bicep contribution than pull-up.',                'pull',       'upper_back',  (SELECT id FROM categories WHERE slug = 'strength'), 15, 100),
    ('Dips',                  'dips',                  'Bodyweight push on parallel bars. Targets chest, triceps and anterior delts.',      'push',       'tricep',      (SELECT id FROM categories WHERE slug = 'strength'), 20, 100),
    ('Push-up',               'push_up',               'Bodyweight horizontal push. Scalable strength and conditioning exercise.',          'push',       'chest',       (SELECT id FROM categories WHERE slug = 'strength'),  1, 100),
    ('Bulgarian Split Squat', 'bulgarian_split_squat', 'Rear foot elevated single leg squat. High quad and glute demand.',                 'legs',       'quad',        (SELECT id FROM categories WHERE slug = 'strength'), 25, 100),
    ('Nordic Curl',           'nordic_curl',           'Eccentric hamstring exercise. Highly effective for injury prevention.',             'pull',       'hamstring',   (SELECT id FROM categories WHERE slug = 'strength'), 40, 100),

    -- Jump power
    ('Box Jump',              'box_jump',              'Explosive jump onto a box. Develops reactive and concentric lower body power.',     'plyometric', 'quad',        (SELECT id FROM categories WHERE slug = 'jump_power'), 30, 100),
    ('Depth Jump',            'depth_jump',            'Step off box and immediately jump vertically. Develops reactive strength.',         'plyometric', 'quad',        (SELECT id FROM categories WHERE slug = 'jump_power'), 50, 100),
    ('Broad Jump',            'broad_jump',            'Maximal horizontal jump from standing. Tests lower body power output.',            'plyometric', 'quad',        (SELECT id FROM categories WHERE slug = 'jump_power'), 20, 100),
    ('Vertical Jump',         'vertical_jump',         'Maximal vertical jump from standing. Standard measure of lower body power.',       'plyometric', 'quad',        (SELECT id FROM categories WHERE slug = 'jump_power'), 20, 100),
    ('Single Leg Box Jump',   'single_leg_box_jump',   'Unilateral explosive jump onto box. High demand on balance and leg power.',        'plyometric', 'quad',        (SELECT id FROM categories WHERE slug = 'jump_power'), 50, 100),

    -- Lower body explosivity
    ('10m Sprint',            'sprint_10m',            'Maximal acceleration sprint over 10 meters. Tests initial explosive speed.',       'cardio',     'full_body',   (SELECT id FROM categories WHERE slug = 'lower_body_explosivity'),  1, 100),
    ('30m Sprint',            'sprint_30m',            'Maximal sprint over 30 meters. Tests acceleration and top speed development.',     'cardio',     'full_body',   (SELECT id FROM categories WHERE slug = 'lower_body_explosivity'),  1, 100),
    ('10m Flying Sprint',     'sprint_10m_flying',     '10m sprint with rolling start. Isolates pure top speed.',                         'cardio',     'full_body',   (SELECT id FROM categories WHERE slug = 'lower_body_explosivity'), 40, 100),
    ('505 Agility Test',      'agility_505',           '5m sprint, 180° turn, 5m sprint back. Standard change-of-direction test.',        'cardio',     'full_body',   (SELECT id FROM categories WHERE slug = 'lower_body_explosivity'), 20, 100),

    -- Upper body explosivity
    ('MB Chest Throw',        'mb_chest_throw',        'Two-hand medicine ball throw from chest. Tests upper body horizontal power.',      'plyometric', 'chest',       (SELECT id FROM categories WHERE slug = 'upper_body_explosivity'),  1, 100),
    ('MB Overhead Throw',     'mb_overhead_throw',     'Two-hand medicine ball throw overhead. Tests total body power transfer.',          'plyometric', 'shoulder',    (SELECT id FROM categories WHERE slug = 'upper_body_explosivity'),  1, 100),
    ('MB Rotational Throw',   'mb_rotational_throw',   'Rotational medicine ball throw against wall. Tests rotational power.',            'plyometric', 'obliques',    (SELECT id FROM categories WHERE slug = 'upper_body_explosivity'),  1, 100),
    ('Clap Push-up',          'clap_push_up',          'Explosive push-up with hand clap at top. Tests upper body reactive strength.',    'plyometric', 'chest',       (SELECT id FROM categories WHERE slug = 'upper_body_explosivity'), 30, 100)

ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Exercise ↔ Equipment mappings
-- ─────────────────────────────────────────────────────────────

INSERT INTO exercise_equipments (exercise_id, equipment_id)
SELECT ex.id, eq.id FROM exercises ex, equipments eq WHERE
    -- Barbell exercises
    (ex.slug = 'back_squat'            AND eq.slug = 'barbell') OR
    (ex.slug = 'front_squat'           AND eq.slug = 'barbell') OR
    (ex.slug = 'romanian_deadlift'     AND eq.slug = 'barbell') OR
    (ex.slug = 'hip_thrust'            AND eq.slug = 'barbell') OR
    (ex.slug = 'bench_press'           AND eq.slug = 'barbell') OR
    (ex.slug = 'incline_bench_press'   AND eq.slug = 'barbell') OR
    (ex.slug = 'bulgarian_split_squat' AND eq.slug = 'barbell') OR

    -- Squat rack
    (ex.slug = 'back_squat'            AND eq.slug = 'squat_rack') OR
    (ex.slug = 'front_squat'           AND eq.slug = 'squat_rack') OR
    (ex.slug = 'bench_press'           AND eq.slug = 'squat_rack') OR
    (ex.slug = 'incline_bench_press'   AND eq.slug = 'squat_rack') OR

    -- Bench
    (ex.slug = 'bench_press'           AND eq.slug = 'bench') OR
    (ex.slug = 'hip_thrust'            AND eq.slug = 'bench') OR
    (ex.slug = 'bulgarian_split_squat' AND eq.slug = 'bench') OR

    -- Incline bench
    (ex.slug = 'incline_bench_press'   AND eq.slug = 'incline_bench') OR

    -- Pull / push stations
    (ex.slug = 'pull_up'               AND eq.slug = 'pull_up_bar') OR
    (ex.slug = 'chin_up'               AND eq.slug = 'pull_up_bar') OR
    (ex.slug = 'dips'                  AND eq.slug = 'dip_bar') OR

    -- Plyometrics
    (ex.slug = 'box_jump'              AND eq.slug = 'plyo_box') OR
    (ex.slug = 'depth_jump'            AND eq.slug = 'plyo_box') OR
    (ex.slug = 'single_leg_box_jump'   AND eq.slug = 'plyo_box') OR
    (ex.slug = 'agility_505'           AND eq.slug = 'agility_cones') OR

    -- Medicine ball
    (ex.slug = 'mb_chest_throw'        AND eq.slug = 'medicine_ball') OR
    (ex.slug = 'mb_overhead_throw'     AND eq.slug = 'medicine_ball') OR
    (ex.slug = 'mb_rotational_throw'   AND eq.slug = 'medicine_ball')

ON CONFLICT DO NOTHING;

-- Weight belt: for weighted pull-ups and dips
INSERT INTO exercise_equipments (exercise_id, equipment_id)
SELECT ex.id, eq.id FROM exercises ex, equipments eq WHERE
    (ex.slug = 'pull_up' AND eq.slug = 'weight_belt') OR
    (ex.slug = 'chin_up' AND eq.slug = 'weight_belt') OR
    (ex.slug = 'dips'    AND eq.slug = 'weight_belt')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Exercise ↔ Block type mappings
-- ─────────────────────────────────────────────────────────────

-- Strength exercises: main + accessory
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN (
    'back_squat', 'front_squat', 'romanian_deadlift', 'hip_thrust',
    'bench_press', 'incline_bench_press', 'pull_up', 'chin_up',
    'dips', 'bulgarian_split_squat', 'nordic_curl'
)
AND bt.slug IN ('main', 'accessory')
ON CONFLICT DO NOTHING;

-- Push-up: warmup + main + accessory
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug = 'push_up'
AND bt.slug IN ('warmup', 'main', 'accessory')
ON CONFLICT DO NOTHING;

-- Jump exercises: activation + main
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN ('box_jump', 'broad_jump', 'vertical_jump', 'single_leg_box_jump', 'depth_jump')
AND bt.slug IN ('activation', 'main')
ON CONFLICT DO NOTHING;

-- Sprint / agility: main only
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN ('sprint_10m', 'sprint_30m', 'sprint_10m_flying', 'agility_505')
AND bt.slug = 'main'
ON CONFLICT DO NOTHING;

-- Upper body explosivity: activation + main
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN ('mb_chest_throw', 'mb_overhead_throw', 'mb_rotational_throw', 'clap_push_up')
AND bt.slug IN ('activation', 'main')
ON CONFLICT DO NOTHING;