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

    -- ─────────────────────────────────────────────────────────
    -- Strength
    -- ─────────────────────────────────────────────────────────

    ('Back Squat',              'back_squat',              'Barbell squat with bar on upper back. Primary lower body strength movement.',          'legs',       'quad',        (SELECT id FROM categories WHERE slug = 'strength'),  20, 100),
    ('Front Squat',             'front_squat',             'Barbell squat with bar on front delts. Demands more core and thoracic mobility.',      'legs',       'quad',        (SELECT id FROM categories WHERE slug = 'strength'),  30, 100),
    ('Goblet Squat',            'goblet_squat',            'Squat holding a dumbbell or kettlebell at chest. Great beginner squat pattern.',       'legs',       'quad',        (SELECT id FROM categories WHERE slug = 'strength'),   1,  40),
    ('Romanian Deadlift',       'romanian_deadlift',       'Hip hinge with barbell. Primary hamstring and glute strength movement.',               'pull',       'hamstring',   (SELECT id FROM categories WHERE slug = 'strength'),  15, 100),
    ('Deadlift',                'deadlift',                'Conventional barbell deadlift from floor. Full posterior chain strength movement.',    'pull',       'hamstring',   (SELECT id FROM categories WHERE slug = 'strength'),  20, 100),
    ('Hip Thrust',              'hip_thrust',              'Barbell hip extension. Isolates glute strength through full range.',                   'push',       'glute',       (SELECT id FROM categories WHERE slug = 'strength'),  10, 100),
    ('Glute Bridge',            'glute_bridge',            'Bodyweight hip extension on floor. Beginner progression to hip thrust.',               'push',       'glute',       (SELECT id FROM categories WHERE slug = 'strength'),   1,  30),
    ('Bench Press',             'bench_press',             'Horizontal barbell press. Primary upper body push movement.',                         'push',       'chest',       (SELECT id FROM categories WHERE slug = 'strength'),  15, 100),
    ('Incline Bench Press',     'incline_bench_press',     'Barbell press at 30–45° incline. Targets upper chest and anterior deltoid.',           'push',       'chest',       (SELECT id FROM categories WHERE slug = 'strength'),  20, 100),
    ('Overhead Press',          'overhead_press',          'Standing barbell press overhead. Primary shoulder strength movement.',                 'push',       'shoulder',    (SELECT id FROM categories WHERE slug = 'strength'),  20, 100),
    ('Pull-up',                 'pull_up',                 'Overhand grip pull to bar. Primary vertical pull movement.',                          'pull',       'upper_back',  (SELECT id FROM categories WHERE slug = 'strength'),  20, 100),
    ('Chin-up',                 'chin_up',                 'Underhand grip pull to bar. More bicep contribution than pull-up.',                   'pull',       'upper_back',  (SELECT id FROM categories WHERE slug = 'strength'),  15, 100),
    ('Inverted Row',            'inverted_row',            'Horizontal pull using a bar at waist height. Beginner pulling movement.',              'pull',       'upper_back',  (SELECT id FROM categories WHERE slug = 'strength'),   1,  40),
    ('Barbell Row',             'barbell_row',             'Bent-over barbell row. Primary horizontal pull movement.',                            'pull',       'upper_back',  (SELECT id FROM categories WHERE slug = 'strength'),  20, 100),
    ('Dips',                    'dips',                    'Bodyweight push on parallel bars. Targets chest, triceps and anterior delts.',        'push',       'tricep',      (SELECT id FROM categories WHERE slug = 'strength'),  20, 100),
    ('Push-up',                 'push_up',                 'Bodyweight horizontal push. Scalable strength and conditioning exercise.',            'push',       'chest',       (SELECT id FROM categories WHERE slug = 'strength'),   1, 100),
    ('Bulgarian Split Squat',   'bulgarian_split_squat',   'Rear foot elevated single leg squat. High quad and glute demand.',                    'legs',       'quad',        (SELECT id FROM categories WHERE slug = 'strength'),  25, 100),
    ('Dumbbell Lunge',          'dumbbell_lunge',          'Walking or stationary lunge with dumbbells. Unilateral leg strength.',                'legs',       'quad',        (SELECT id FROM categories WHERE slug = 'strength'),  10,  60),
    ('Nordic Curl',             'nordic_curl',             'Eccentric hamstring exercise. Highly effective for injury prevention.',               'pull',       'hamstring',   (SELECT id FROM categories WHERE slug = 'strength'),  40, 100),

    -- ─────────────────────────────────────────────────────────
    -- Jump power
    -- ─────────────────────────────────────────────────────────

    ('Box Jump',                'box_jump',                'Explosive jump onto a box. Develops reactive and concentric lower body power.',       'plyometric', 'quad',        (SELECT id FROM categories WHERE slug = 'jump_power'),  30, 100),
    ('Depth Jump',              'depth_jump',              'Step off box and immediately jump vertically. Develops reactive strength.',           'plyometric', 'quad',        (SELECT id FROM categories WHERE slug = 'jump_power'),  50, 100),
    ('Broad Jump',              'broad_jump',              'Maximal horizontal jump from standing. Tests lower body power output.',              'plyometric', 'quad',        (SELECT id FROM categories WHERE slug = 'jump_power'),  20, 100),
    ('Vertical Jump',           'vertical_jump',           'Maximal vertical jump from standing. Standard measure of lower body power.',         'plyometric', 'quad',        (SELECT id FROM categories WHERE slug = 'jump_power'),  20, 100),
    ('Single Leg Box Jump',     'single_leg_box_jump',     'Unilateral explosive jump onto box. High demand on balance and leg power.',          'plyometric', 'quad',        (SELECT id FROM categories WHERE slug = 'jump_power'),  50, 100),
    ('Single Leg Broad Jump',   'single_leg_broad_jump',   'Unilateral horizontal jump. Tests leg power asymmetry.',                            'plyometric', 'quad',        (SELECT id FROM categories WHERE slug = 'jump_power'),  40, 100),
    ('Hurdle Jump',             'hurdle_jump',             'Continuous jumps over hurdles. Develops reactive and rhythmic lower body power.',    'plyometric', 'quad',        (SELECT id FROM categories WHERE slug = 'jump_power'),  35, 100),

    -- ─────────────────────────────────────────────────────────
    -- Lower body explosivity
    -- ─────────────────────────────────────────────────────────

    ('10m Sprint',              'sprint_10m',              'Maximal acceleration sprint over 10 meters. Tests initial explosive speed.',         'cardio',     'full_body',   (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'),   1, 100),
    ('30m Sprint',              'sprint_30m',              'Maximal sprint over 30 meters. Tests acceleration and top speed development.',       'cardio',     'full_body',   (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'),   1, 100),
    ('10m Flying Sprint',       'sprint_10m_flying',       '10m sprint with rolling start. Isolates pure top speed.',                           'cardio',     'full_body',   (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'),  40, 100),
    ('505 Agility Test',        'agility_505',             '5m sprint, 180° turn, 5m sprint back. Standard change-of-direction test.',          'cardio',     'full_body',   (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'),  20, 100),
    ('Lateral Bound',           'lateral_bound',           'Explosive lateral jumps from one foot to the other. Tests lateral power.',          'plyometric', 'glute',       (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'),  20, 100),
    ('Skater Jump',             'skater_jump',             'Unilateral lateral jumps mimicking skating motion. Tests lateral explosivity.',      'plyometric', 'glute',       (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'),  25, 100),

    -- ─────────────────────────────────────────────────────────
    -- Upper body explosivity
    -- ─────────────────────────────────────────────────────────

    ('MB Chest Throw',          'mb_chest_throw',          'Two-hand medicine ball throw from chest. Tests upper body horizontal power.',        'plyometric', 'chest',       (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics'),   1, 100),
    ('MB Overhead Throw',       'mb_overhead_throw',       'Two-hand medicine ball throw overhead. Tests total body power transfer.',            'plyometric', 'shoulder',    (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics'),   1, 100),
    ('MB Rotational Throw',     'mb_rotational_throw',     'Rotational medicine ball throw against wall. Tests rotational power.',              'plyometric', 'obliques',    (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics'),   1, 100),
    ('MB Slam',                 'mb_slam',                 'Overhead medicine ball slam to ground. Full body power with emphasis on lats.',      'plyometric', 'upper_back',  (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics'),   1, 100),
    ('Clap Push-up',            'clap_push_up',            'Explosive push-up with hand clap at top. Tests upper body reactive strength.',      'plyometric', 'chest',       (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics'),  30, 100),
    ('Explosive Push-up',       'explosive_push_up',       'Push-up with maximal push-off height. Beginner version of clap push-up.',           'plyometric', 'chest',       (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics'),  10,  50),

    -- ─────────────────────────────────────────────────────────
    -- Mobility
    -- ─────────────────────────────────────────────────────────

    -- Ankle
    ('Ankle Circles',                  'ankle_circles',                  'Slow circular ankle rotations. Improves ankle joint mobility.',                          'mobility', 'ankle',      (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),
    ('Ankle Dorsiflexion Stretch',     'ankle_dorsiflexion_stretch',     'Knee to wall stretch. Directly targets ankle dorsiflexion range.',                       'mobility', 'ankle',      (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),
    ('Calf Stretch',                   'calf_stretch',                   'Standing calf stretch against wall. Targets gastrocnemius and soleus.',                   'mobility', 'calf',       (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),

    -- Hip
    ('Hip 90/90 Stretch',              'hip_90_90',                      'Seated 90/90 position. Targets hip internal and external rotation.',                      'mobility', 'hip',        (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),
    ('Pigeon Pose',                    'pigeon_pose',                    'Deep hip opener targeting the piriformis and external rotators.',                         'mobility', 'hip',        (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),
    ('Hip Flexor Stretch',             'hip_flexor_stretch',             'Kneeling lunge stretch. Targets hip flexors and psoas.',                                  'mobility', 'hip',        (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),
    ('Lateral Hip Stretch',            'lateral_hip_stretch',            'Side-lying hip stretch. Targets hip abductors and IT band.',                              'mobility', 'hip',        (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),
    ('Couch Stretch',                  'couch_stretch',                  'Deep quad and hip flexor stretch with rear foot elevated against wall.',                  'mobility', 'hip',        (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),

    -- Hamstring
    ('Standing Hamstring Stretch',     'standing_hamstring_stretch',     'Standing forward fold. Targets hamstring length.',                                        'mobility', 'hamstring',  (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),
    ('Seated Hamstring Stretch',       'seated_hamstring_stretch',       'Seated forward fold with legs extended. Targets hamstring and calf.',                     'mobility', 'hamstring',  (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),
    ('Nordic Hamstring Stretch',       'nordic_hamstring_stretch',       'Dynamic eccentric hamstring lengthening. High demand stretch.',                           'mobility', 'hamstring',  (SELECT id FROM categories WHERE slug = 'mobility'), 30, 100),

    -- Quad / Knee
    ('Quad Stretch',                   'quad_stretch',                   'Standing quad stretch. Targets rectus femoris.',                                          'mobility', 'quad',       (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),

    -- Groin
    ('Groin Stretch',                  'groin_stretch',                  'Wide stance seated or standing groin stretch. Targets hip adductors.',                    'mobility', 'groin',      (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),
    ('Cossack Squat',                  'cossack_squat',                  'Deep lateral squat alternating sides. Targets groin, hip and ankle mobility.',            'mobility', 'groin',      (SELECT id FROM categories WHERE slug = 'mobility'), 20, 100),

    -- Thoracic
    ('Thoracic Rotation',              'thoracic_rotation',              'Seated or quadruped thoracic rotation. Improves upper back rotational mobility.',         'mobility', 'thoracic',   (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),
    ('Cat Cow',                        'cat_cow',                        'Quadruped spinal flexion and extension. Improves full spinal mobility.',                  'mobility', 'thoracic',   (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),
    ('Thoracic Extension Foam Roller', 'thoracic_extension_foam_roller', 'Foam roller thoracic extension. Directly targets thoracic spine extension.',             'mobility', 'thoracic',   (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),

    -- Full body
    ('World Greatest Stretch',         'world_greatest_stretch',         'Lunge with thoracic rotation and hip opener. Full body mobility in one movement.',       'mobility', 'full_body',  (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),
    ('Deep Squat Hold',                'deep_squat_hold',                'Held deep squat position. Targets ankle, knee, hip and thoracic mobility.',              'mobility', 'full_body',  (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),
    ('Inchworm',                       'inchworm',                       'Walk hands out to plank and back. Dynamic full body warmup and mobility drill.',          'mobility', 'full_body',  (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),
    ('Leg Swing',                      'leg_swing',                      'Dynamic forward and lateral leg swings. Hip mobility warmup.',                           'mobility', 'hip',        (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),

    -- Strength (core & unilateral additions)
    ('Single Leg RDL',   'single_leg_rdl',   'Unilateral hip hinge. Exposes and corrects leg asymmetries.',                         'pull',      'hamstring', (SELECT id FROM categories WHERE slug = 'strength'),  15, 100),
    ('Step-up',          'step_up',          'Step onto an elevated surface with one leg. Beginner-friendly unilateral leg exercise.', 'legs',      'quad',      (SELECT id FROM categories WHERE slug = 'strength'),   1, 100),
    ('Face Pull',        'face_pull',        'Resistance band pull to face. Essential for shoulder health and external rotation.',   'pull',      'shoulder',  (SELECT id FROM categories WHERE slug = 'strength'),   1, 100),
    ('Plank',            'plank',            'Isometric front plank hold. Foundational core stability exercise.',                   'isometric', 'core',      (SELECT id FROM categories WHERE slug = 'strength'),   1, 100),
    ('Side Plank',       'side_plank',       'Isometric lateral plank hold. Targets obliques and lateral core stability.',         'isometric', 'obliques',  (SELECT id FROM categories WHERE slug = 'strength'),   1, 100),
    ('Pallof Press',     'pallof_press',     'Anti-rotation press with resistance band. Trains core stability under rotational load.', 'core',    'obliques',  (SELECT id FROM categories WHERE slug = 'strength'),   1, 100),

    -- Mobility (shoulder & spine additions)
    ('Shoulder Circles',       'shoulder_circles',       'Active arm circles. Increases synovial fluid and shoulder ROM.',                    'mobility', 'shoulder',   (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),
    ('Shoulder Cross Stretch', 'shoulder_cross_stretch', 'Horizontal adduction across chest. Targets posterior shoulder and rotator cuff.',   'mobility', 'shoulder',   (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),
    ('Doorway Stretch',        'doorway_stretch',        'Pectoral stretch in a doorframe. Opens anterior shoulder and chest.',               'mobility', 'chest',      (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),
    ('Lower Back Twist',       'lower_back_twist',       'Supine lumbar rotation stretch. Releases tension in the lower back.',               'mobility', 'lower_back', (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),
    ('Seated Spinal Twist',    'seated_spinal_twist',    'Seated thoracic rotation stretch. Improves spinal mobility and reduces stiffness.', 'mobility', 'thoracic',   (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),
    ('Figure Four Stretch',    'figure_four_stretch',    'Supine piriformis stretch. Targets glute and hip external rotators.',               'mobility', 'glute',      (SELECT id FROM categories WHERE slug = 'mobility'),  1, 100),

    -- Plyometrics
    ('Pogo Jumps',  'pogo_jumps',  'Rapid continuous ankle hops on the spot. Develops reactive strength and tendon stiffness.', 'plyometric', 'calf', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 20, 100),
    ('Split Jump',  'split_jump',  'Explosive lunge jump with leg switch in air. Builds unilateral lower body power.',           'plyometric', 'quad', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 25, 100),
    ('Tuck Jump',   'tuck_jump',   'Jump and pull knees to chest at peak height. Develops explosive power and body control.',    'plyometric', 'quad', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 30, 100)

ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Exercise ↔ Equipment mappings
-- ─────────────────────────────────────────────────────────────

-- Required equipment
INSERT INTO exercise_equipments (exercise_id, equipment_id)
SELECT ex.id, eq.id FROM exercises ex, equipments eq WHERE
    -- Barbell exercises
    (ex.slug = 'back_squat'              AND eq.slug = 'barbell') OR
    (ex.slug = 'front_squat'             AND eq.slug = 'barbell') OR
    (ex.slug = 'romanian_deadlift'       AND eq.slug = 'barbell') OR
    (ex.slug = 'deadlift'                AND eq.slug = 'barbell') OR
    (ex.slug = 'hip_thrust'              AND eq.slug = 'barbell') OR
    (ex.slug = 'bench_press'             AND eq.slug = 'barbell') OR
    (ex.slug = 'incline_bench_press'     AND eq.slug = 'barbell') OR
    (ex.slug = 'overhead_press'          AND eq.slug = 'barbell') OR
    (ex.slug = 'barbell_row'             AND eq.slug = 'barbell') OR
    (ex.slug = 'bulgarian_split_squat'   AND eq.slug = 'barbell') OR

    -- Squat rack
    (ex.slug = 'back_squat'              AND eq.slug = 'squat_rack') OR
    (ex.slug = 'front_squat'             AND eq.slug = 'squat_rack') OR
    (ex.slug = 'bench_press'             AND eq.slug = 'squat_rack') OR
    (ex.slug = 'incline_bench_press'     AND eq.slug = 'squat_rack') OR
    (ex.slug = 'overhead_press'          AND eq.slug = 'squat_rack') OR

    -- Bench
    (ex.slug = 'bench_press'             AND eq.slug = 'bench') OR
    (ex.slug = 'hip_thrust'              AND eq.slug = 'bench') OR
    (ex.slug = 'bulgarian_split_squat'   AND eq.slug = 'bench') OR

    -- Incline bench
    (ex.slug = 'incline_bench_press'     AND eq.slug = 'incline_bench') OR

    -- Dumbbell
    (ex.slug = 'goblet_squat'            AND eq.slug = 'dumbbell') OR
    (ex.slug = 'dumbbell_lunge'          AND eq.slug = 'dumbbell') OR

    -- Pull / push stations
    (ex.slug = 'pull_up'                 AND eq.slug = 'pull_up_bar') OR
    (ex.slug = 'chin_up'                 AND eq.slug = 'pull_up_bar') OR
    (ex.slug = 'inverted_row'            AND eq.slug = 'pull_up_bar') OR
    (ex.slug = 'dips'                    AND eq.slug = 'dip_bar') OR

    -- Plyometrics
    (ex.slug = 'box_jump'                AND eq.slug = 'plyo_box') OR
    (ex.slug = 'depth_jump'              AND eq.slug = 'plyo_box') OR
    (ex.slug = 'single_leg_box_jump'     AND eq.slug = 'plyo_box') OR
    (ex.slug = 'agility_505'             AND eq.slug = 'agility_cones') OR

    -- Medicine ball
    (ex.slug = 'mb_chest_throw'          AND eq.slug = 'medicine_ball') OR
    (ex.slug = 'mb_overhead_throw'       AND eq.slug = 'medicine_ball') OR
    (ex.slug = 'mb_rotational_throw'     AND eq.slug = 'medicine_ball') OR
    (ex.slug = 'mb_slam'                 AND eq.slug = 'medicine_ball') OR

    -- Foam roller
    (ex.slug = 'thoracic_extension_foam_roller' AND eq.slug = 'foam_roller') OR

    -- Resistance band
    (ex.slug = 'face_pull'    AND eq.slug = 'resistance_band') OR
    (ex.slug = 'pallof_press' AND eq.slug = 'resistance_band')

ON CONFLICT DO NOTHING;

-- Optional equipment
INSERT INTO exercise_equipments (exercise_id, equipment_id)
SELECT ex.id, eq.id FROM exercises ex, equipments eq WHERE
    -- Weight belt optional for pull variations and dips
    (ex.slug = 'pull_up'   AND eq.slug = 'weight_belt') OR
    (ex.slug = 'chin_up'   AND eq.slug = 'weight_belt') OR
    (ex.slug = 'dips'      AND eq.slug = 'weight_belt') OR

    -- Goblet squat can also use kettlebell
    (ex.slug = 'goblet_squat' AND eq.slug = 'kettlebell') OR

    -- Step-up optional box
    (ex.slug = 'step_up' AND eq.slug = 'plyo_box')

ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Exercise ↔ Block type mappings
-- ─────────────────────────────────────────────────────────────

-- Strength: main + accessory
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN (
    'back_squat', 'front_squat', 'romanian_deadlift', 'deadlift',
    'hip_thrust', 'bench_press', 'incline_bench_press', 'overhead_press',
    'pull_up', 'chin_up', 'dips', 'barbell_row',
    'bulgarian_split_squat', 'nordic_curl'
)
AND bt.slug IN ('main', 'accessory')
ON CONFLICT DO NOTHING;

-- Beginner strength: warmup + main + accessory
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN (
    'push_up', 'goblet_squat', 'glute_bridge',
    'inverted_row', 'dumbbell_lunge'
)
AND bt.slug IN ('warmup', 'main', 'accessory')
ON CONFLICT DO NOTHING;

-- Jump power: activation + main
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN (
    'box_jump', 'broad_jump', 'vertical_jump',
    'single_leg_box_jump', 'depth_jump',
    'single_leg_broad_jump', 'hurdle_jump'
)
AND bt.slug IN ('activation', 'main')
ON CONFLICT DO NOTHING;

-- Lower body explosivity: main only
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN (
    'sprint_10m', 'sprint_30m', 'sprint_10m_flying',
    'agility_505', 'lateral_bound', 'skater_jump'
)
AND bt.slug = 'main'
ON CONFLICT DO NOTHING;

-- Upper body explosivity: activation + main
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN (
    'mb_chest_throw', 'mb_overhead_throw', 'mb_rotational_throw',
    'mb_slam', 'clap_push_up', 'explosive_push_up'
)
AND bt.slug IN ('activation', 'main')
ON CONFLICT DO NOTHING;

-- Mobility: warmup + cooldown
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN (
    'ankle_circles', 'ankle_dorsiflexion_stretch', 'calf_stretch',
    'hip_90_90', 'pigeon_pose', 'hip_flexor_stretch', 'lateral_hip_stretch', 'couch_stretch',
    'standing_hamstring_stretch', 'seated_hamstring_stretch', 'nordic_hamstring_stretch',
    'quad_stretch', 'groin_stretch', 'cossack_squat',
    'thoracic_rotation', 'cat_cow', 'thoracic_extension_foam_roller',
    'world_greatest_stretch', 'deep_squat_hold', 'inchworm', 'leg_swing'
)
AND bt.slug IN ('warmup', 'cooldown')
ON CONFLICT DO NOTHING;

-- Dynamic mobility also fits activation
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN (
    'world_greatest_stretch', 'inchworm', 'leg_swing',
    'ankle_circles', 'hip_flexor_stretch', 'thoracic_rotation'
)
AND bt.slug = 'activation'
ON CONFLICT DO NOTHING;

-- Strength additions (main + accessory)
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN ('single_leg_rdl', 'step_up', 'face_pull')
AND bt.slug IN ('main', 'accessory')
ON CONFLICT DO NOTHING;

-- Core stability (warmup + activation + accessory)
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN ('plank', 'side_plank', 'pallof_press')
AND bt.slug IN ('warmup', 'activation', 'accessory')
ON CONFLICT DO NOTHING;

-- Shoulder mobility also fits activation
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN (
    'shoulder_circles', 'shoulder_cross_stretch', 'doorway_stretch',
    'lower_back_twist', 'seated_spinal_twist', 'figure_four_stretch'
)
AND bt.slug IN ('warmup', 'cooldown')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN ('shoulder_circles', 'shoulder_cross_stretch')
AND bt.slug = 'activation'
ON CONFLICT DO NOTHING;

-- Plyometrics: activation + main
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN ('pogo_jumps', 'split_jump', 'tuck_jump')
AND bt.slug IN ('activation', 'main')
ON CONFLICT DO NOTHING;