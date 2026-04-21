-- ─────────────────────────────────────────────────────────────
-- Base exercises
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
    ('Box Jump',              'box_jump',              'Explosive jump onto a box. Develops reactive and concentric lower body power.',     'plyometric', 'quad',        (SELECT id FROM categories WHERE slug = 'jumps'), 30, 100),
    ('Depth Jump',            'depth_jump',            'Step off box and immediately jump vertically. Develops reactive strength.',         'plyometric', 'quad',        (SELECT id FROM categories WHERE slug = 'jumps'), 50, 100),
    ('Broad Jump',            'broad_jump',            'Maximal horizontal jump from standing. Tests lower body power output.',            'plyometric', 'quad',        (SELECT id FROM categories WHERE slug = 'jumps'), 20, 100),
    ('Vertical Jump',         'vertical_jump',         'Maximal vertical jump from standing. Standard measure of lower body power.',       'plyometric', 'quad',        (SELECT id FROM categories WHERE slug = 'jumps'), 20, 100),
    ('Single Leg Box Jump',   'single_leg_box_jump',   'Unilateral explosive jump onto box. High demand on balance and leg power.',        'plyometric', 'quad',        (SELECT id FROM categories WHERE slug = 'jumps'), 50, 100),

    -- Lower body explosivity
    ('10m Sprint',            'sprint_10m',            'Maximal acceleration sprint over 10 meters. Tests initial explosive speed.',       'cardio',     'full_body',   (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'),  1, 100),
    ('30m Sprint',            'sprint_30m',            'Maximal sprint over 30 meters. Tests acceleration and top speed development.',     'cardio',     'full_body',   (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'),  1, 100),
    ('10m Flying Sprint',     'sprint_10m_flying',     '10m sprint with rolling start. Isolates pure top speed.',                         'cardio',     'full_body',   (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 40, 100),
    ('505 Agility Test',      'agility_505',           '5m sprint, 180° turn, 5m sprint back. Standard change-of-direction test.',        'cardio',     'full_body',   (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 20, 100),

    -- Upper body explosivity
    ('MB Chest Throw',        'mb_chest_throw',        'Two-hand medicine ball throw from chest. Tests upper body horizontal power.',      'plyometric', 'chest',       (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics'),  1, 100),
    ('MB Overhead Throw',     'mb_overhead_throw',     'Two-hand medicine ball throw overhead. Tests total body power transfer.',          'plyometric', 'shoulder',    (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics'),  1, 100),
    ('MB Rotational Throw',   'mb_rotational_throw',   'Rotational medicine ball throw against wall. Tests rotational power.',            'plyometric', 'obliques',    (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics'),  1, 100),
    ('Clap Push-up',          'clap_push_up',          'Explosive push-up with hand clap at top. Tests upper body reactive strength.',    'plyometric', 'chest',       (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics'), 30, 100)

ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Equipment mappings for base exercises
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

    -- Weight belt (weighted variations)
    (ex.slug = 'pull_up'               AND eq.slug = 'weight_belt') OR
    (ex.slug = 'chin_up'               AND eq.slug = 'weight_belt') OR
    (ex.slug = 'dips'                  AND eq.slug = 'weight_belt') OR

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

-- ─────────────────────────────────────────────────────────────
-- Block type mappings for base exercises
-- ─────────────────────────────────────────────────────────────

-- Strength exercises: primary + secondary + accessory
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN (
    'back_squat', 'front_squat', 'romanian_deadlift', 'hip_thrust',
    'bench_press', 'incline_bench_press', 'pull_up', 'chin_up',
    'dips', 'bulgarian_split_squat', 'nordic_curl'
)
AND bt.slug IN ('primary', 'secondary', 'accessory')
ON CONFLICT DO NOTHING;

-- Push-up: warmup + primary + secondary + accessory
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug = 'push_up'
AND bt.slug IN ('warmup', 'primary', 'secondary', 'accessory')
ON CONFLICT DO NOTHING;

-- Jump exercises: warmup + primary + secondary
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN ('box_jump', 'broad_jump', 'vertical_jump', 'single_leg_box_jump', 'depth_jump')
AND bt.slug IN ('warmup', 'primary', 'secondary')
ON CONFLICT DO NOTHING;

-- Sprint / agility: primary + secondary
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN ('sprint_10m', 'sprint_30m', 'sprint_10m_flying', 'agility_505')
AND bt.slug IN ('primary', 'secondary')
ON CONFLICT DO NOTHING;

-- Upper body explosivity: warmup + primary + secondary
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN ('mb_chest_throw', 'mb_overhead_throw', 'mb_rotational_throw', 'clap_push_up')
AND bt.slug IN ('warmup', 'primary', 'secondary')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Additional exercises from exercise_database.csv
-- ─────────────────────────────────────────────────────────────

-- JUMP POWER
INSERT INTO exercises (name, slug, description, movement_pattern, body_region, category_id, min_level, max_level) VALUES
    ('Lateral Bounds', 'lateral_bounds', 'Side-to-side single-leg hops developing lateral power and knee stability.', 'plyometric', 'full_body', (SELECT id FROM categories WHERE slug = 'jumps'), 1, 60),
    ('Hurdle Hops', 'hurdle_hops', 'Continuous two-foot hops over mini hurdles to develop elastic stiffness and reactive power.', 'plyometric', 'quad', (SELECT id FROM categories WHERE slug = 'jumps'), 30, 60),
    ('Drop Jump', 'drop_jump', 'Fall from box height and immediately jump as high as possible to maximize reactive strength index.', 'plyometric', 'full_body', (SELECT id FROM categories WHERE slug = 'jumps'), 60, 100),
    ('Pogos', 'pogos', 'Rapid stiff-legged ankle bounces to develop reactive ankle stiffness and elastic energy storage.', 'plyometric', 'calf', (SELECT id FROM categories WHERE slug = 'jumps'), 1, 60),
    ('Lateral Hurdle Hop', 'lateral_hurdle_hop', 'Continuous lateral single-leg hops over mini hurdle to develop frontal plane reactive power.', 'plyometric', 'quad', (SELECT id FROM categories WHERE slug = 'jumps'), 30, 60),
    ('Jump Squat', 'jump_squat', 'Explosive squat jump to develop lower body power and reactive strength without equipment.', 'plyometric', 'quad', (SELECT id FROM categories WHERE slug = 'jumps'), 1, 60),
    ('Squat Jump to Stick', 'squat_jump_to_stick', 'Explosive squat jump landing and holding position to train landing mechanics and power.', 'plyometric', 'quad', (SELECT id FROM categories WHERE slug = 'jumps'), 1, 60)
ON CONFLICT DO NOTHING;

-- LOWER BODY EXPLOSIVITY
INSERT INTO exercises (name, slug, description, movement_pattern, body_region, category_id, min_level, max_level) VALUES
    ('Sled Push', 'sled_push', 'Explosive sled drive to develop horizontal power and sprint-specific leg strength.', 'legs', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 1, 60),
    ('Sled Pull', 'sled_pull', 'Resisted backward drag to develop hip flexor and quad strength in sport-specific postures.', 'legs', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 1, 60),
    ('Resisted Sprint', 'resisted_sprint', 'Sprint with sled resistance to overload acceleration mechanics and horizontal force production.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 30, 60),
    ('Sprint Parachute Run', 'sprint_parachute_run', 'Sprint with drag parachute to develop sprint-specific horizontal force at high velocity.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 30, 60),
    ('Flying 20 Sprint', 'flying_20_sprint', 'Maximal velocity sprint with rolling start to develop top-end running speed.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 30, 60),
    ('Acceleration Sprint 10m', 'acceleration_sprint_10m', 'Short maximal effort sprint to develop explosive acceleration and first-step quickness.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 1, 60),
    ('Prowler Push Sprint', 'prowler_push_sprint', 'Maximum effort sprint-pace push of loaded prowler sled for power endurance.', 'cardio', 'upper_back', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 30, 60),
    ('Sprint Start from Blocks', 'sprint_start_blocks', 'Race start using starting blocks to develop explosive initial acceleration and drive phase mechanics', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 30, 60),
    ('A-Skip Drill', 'a_skip_drill', 'High knee skipping drill to groove sprint mechanics and reinforce proper foot strike pattern.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 1, 60),
    ('B-Skip Drill', 'b_skip_drill', 'Extension-phase sprint drill reinforcing hamstring cycling and pawback mechanics.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 30, 60),
    ('High Knees', 'high_knees', 'Running in place with maximal knee drive to develop hip flexor power and sprint frequency.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 1, 60),
    ('Butt Kicks', 'butt_kicks', 'Rapid heel-to-glute running drill reinforcing hamstring snap and sprint mechanics.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 1, 30),
    ('Wall Drill March', 'wall_drill_march', 'Standing sprint drill against wall to perfect hip mechanics and high knee drive.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 1, 30),
    ('Banded Hip Flexor March', 'banded_hip_flexor_march', 'Resisted hip flexion march to develop hip flexor strength and sprint stride rate.', 'legs', 'hip', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 1, 30),
    ('Agility Ladder Ickey Shuffle', 'agility_ladder_ickey_shuffle', 'Lateral shuffle footwork pattern in agility ladder to develop foot speed and coordination.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 1, 30),
    ('Agility Ladder Single Leg Hops', 'agility_ladder_single_leg_hops', 'Unilateral hops through agility ladder to develop reactive foot contact and balance.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 30, 60),
    ('5-10-5 Pro Agility Shuttle', 'pro_agility_shuttle', 'Classic NFL combine drill requiring rapid deceleration and reacceleration to assess lateral speed.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 30, 60),
    ('T-Drill', 't_drill', 'Multi-directional agility drill covering forward sprint and lateral shuffle for change of direction ', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 30, 60),
    ('Reactive Drop Catch', 'reactive_drop_catch', 'Partner drops ball from height and athlete reacts to catch before second bounce to train reaction sp', 'other', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 30, 60),
    ('Jump Rope Standard', 'jump_rope_standard', 'Continuous skipping to elevate heart rate and develop ankle stiffness and rhythm.', 'cardio', 'calf', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 1, 30),
    ('Jump Rope Double Under', 'jump_rope_double_under', 'Two rope revolutions per jump to develop explosive calf power and coordination.', 'cardio', 'calf', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 30, 60),
    ('Burpee', 'burpee', 'Full-body floor-to-stand explosive movement combining strength and conditioning demands.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 1, 60),
    ('Burpee Broad Jump', 'burpee_broad_jump', 'Burpee with explosive horizontal jump to maximize power output and conditioning.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 30, 60),
    ('Bear Crawl', 'bear_crawl', 'Quadruped forward crawl to develop shoulder stability, core strength and coordination.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 1, 60),
    ('Lateral Shuffle', 'lateral_shuffle', 'Side-to-side athletic shuffle to develop lateral quickness and hip abductor endurance.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 1, 60),
    ('Shadow Boxing', 'shadow_boxing', 'Continuous punching combinations to develop upper-body endurance and coordination.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 1, 60),
    ('Jumping Jacks', 'jumping_jacks', 'Full-body jumping movement to raise heart rate and coordinate limb timing.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 1, 30),
    ('Star Jump', 'star_jump', 'Explosive jumping jack variant driving arms and legs wide at peak height.', 'plyometric', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 1, 60),
    ('Sprint in Place', 'sprint_in_place', 'Maximal leg turnover in place to develop sprint frequency and hip flexor speed.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 1, 60),
    ('Stair Sprint', 'stair_sprint', 'Explosive stair climbing sprint to develop lower body power and cardiovascular capacity.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 1, 60),
    ('Banded Sprint Resistance Run', 'banded_sprint_resistance_run', 'Running with band attached to waist for resisted acceleration training at home or outdoors.', 'cardio', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 30, 60),
    ('Dumbbell Snatch', 'dumbbell_snatch', 'Single-arm explosive pull from floor to overhead to develop unilateral power.', 'pull', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 30, 60),
    ('Dumbbell Clean', 'dumbbell_clean', 'Single or double dumbbell clean to develop explosive pulling power without a barbell.', 'pull', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 30, 60),
    ('Dumbbell Swing', 'dumbbell_swing', 'Kettlebell-style hip hinge swing with dumbbell to develop posterior chain power.', 'legs', 'full_body', (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics'), 1, 60)
ON CONFLICT DO NOTHING;

-- MOBILITY
INSERT INTO exercises (name, slug, description, movement_pattern, body_region, category_id, min_level, max_level) VALUES
    ('World''s Greatest Stretch', 'worlds_greatest_stretch', 'Multi-joint mobility drill combining hip flexor and thoracic mobility in one dynamic sequence.', 'mobility', 'full_body',  (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Hip CARs',                  'hip_cars',                'Full-range active circular hip rotations to maintain hip joint health and end-range control.',     'mobility', 'hip',        (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Shoulder CARs',             'shoulder_cars',           'Controlled full-range shoulder rotations to maintain joint integrity and improve overhead range.',   'mobility', 'shoulder',   (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Ankle CARs',                'ankle_cars',              'Slow circular ankle rotations at full range to improve ankle mobility and joint health.',            'mobility', 'ankle',      (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Banded Ankle Distraction',  'banded_ankle_distraction','Band-assisted ankle dorsiflexion mobilization to improve squat depth and sprint mechanics.',         'mobility', 'ankle',      (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Hip 90/90 Stretch',         'hip_90_90_stretch',       'Seated hip mobility drill improving internal and external hip rotation essential for athletic movement.', 'mobility', 'hip',   (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Hip Flexor Lunge Stretch',  'hip_flexor_lunge_stretch','Kneeling lunge position stretching hip flexors and psoas critical for sprint mechanics.',           'mobility', 'hip',        (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Leg Swing Front to Back',   'leg_swing_front_to_back', 'Dynamic hip flexion and extension swings to prepare hamstrings for sprinting.',                     'mobility', 'hip',        (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Leg Swing Side to Side',    'leg_swing_side_to_side',  'Lateral hip swing to mobilize hip abductors and adductors prior to lateral sport activity.',        'mobility', 'hip',        (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Arm Circle',                'arm_circle',              'Shoulder joint mobilization warm-up to prepare rotator cuff before overhead pressing or throwing.',  'mobility', 'shoulder',   (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Standing Quad Stretch',     'standing_quad_stretch',   'Upright single-leg quad stretch to restore anterior thigh length after running or squatting.',       'mobility', 'quad',       (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Kneeling Adductor Stretch', 'kneeling_adductor_stretch','Groin and inner thigh stretch targeting adductors critical for lateral movement athletes.',         'mobility', 'groin',      (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Doorway Chest Stretch',     'doorway_chest_stretch',   'Pectoral and anterior shoulder stretch to counteract pressing mechanics and improve posture.',       'mobility', 'chest',      (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Thoracic Foam Roll',        'thoracic_foam_roll',      'Spinal extension mobilization over foam roller to improve thoracic mobility and posture.',           'mobility', 'thoracic',   (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Lat Foam Roll',             'lat_foam_roll',           'Lateral torso rolling to release lat tightness and improve overhead shoulder range.',               'mobility', 'upper_back',  (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Quad Foam Roll',            'quad_foam_roll',          'Anterior thigh rolling to reduce quad tension before and after heavy training.',                    'mobility', 'quad',        (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Hamstring Foam Roll',       'hamstring_foam_roll',     'Posterior thigh rolling to reduce DOMS and improve tissue quality in sprint athletes.',             'mobility', 'hamstring',   (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('IT Band Foam Roll',         'it_band_foam_roll',       'Lateral thigh rolling to reduce tightness in the iliotibial band and lateral knee pain.',           'mobility', 'hip',         (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Glute Foam Roll',           'glute_foam_roll',         'Glute and piriformis rolling to release hip rotator tightness before or after training.',           'mobility', 'glute',       (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Child''s Pose',             'childs_pose',             'Restorative hip and thoracic flexion to decompress spine and calm nervous system.',                 'mobility', 'thoracic',    (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Supine Twist',              'supine_twist',            'Lying rotational stretch to release lumbar tightness and restore thoracic rotation post-training.', 'mobility', 'thoracic',    (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Diaphragmatic Breathing',   'diaphragmatic_breathing', 'Slow belly breathing protocol to activate parasympathetic nervous system and enhance recovery.',     'mobility', 'full_body',   (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Box Breathing',             'box_breathing',           '4-4-4-4 breath control technique to reduce cortisol and prepare CNS for training or competition.',  'mobility', 'full_body',   (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Yoga Sun Salutation',       'yoga_sun_salutation',     'Connected posture sequence to restore flexibility and calm nervous system post-training.',           'mobility', 'full_body',   (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Cat-Cow Stretch',           'cat_cow_stretch',         'Spinal flexion and extension sequence to mobilize the thoracic and lumbar spine post-training.',    'mobility', 'thoracic',    (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Thread the Needle',         'thread_the_needle',       'Rotational shoulder and thoracic stretch from quadruped to improve thoracic mobility.',             'mobility', 'thoracic',    (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Prone Hip Internal Rotation','prone_hip_internal_rotation','Lying face down ankle rotation to improve hip internal rotation lost from sitting and training.','mobility', 'hip',         (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Standing Calf Stretch',     'standing_calf_stretch',   'Wall-supported calf and Achilles stretch to restore dorsiflexion range of motion.',                 'mobility', 'calf',        (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Seated Piriformis Stretch', 'seated_piriformis_stretch','Figure-four stretch targeting the piriformis and deep hip external rotators.',                      'mobility', 'glute',       (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Upper Trap Stretch',        'upper_trap_stretch',      'Lateral neck tilt to release upper trapezius tension accumulated from training.',                   'mobility', 'neck',        (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Wrist Mobility Circles',    'wrist_mobility_circles',  'Circular wrist rotations and extensions to prepare and recover wrists for pushing movements.',      'mobility', 'forearm',     (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Thoracic Extension on Chair','thoracic_extension_chair','Using chair backrest as mobilization point to restore thoracic extension without foam roller.',     'mobility', 'thoracic',    (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Standing Spinal Rotation',  'standing_spinal_rotation','Standing trunk rotation to warm up or release thoracic rotation for athletic movements.',            'mobility', 'thoracic',    (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60),
    ('Neck Circles',              'neck_circles',            'Controlled cervical rotation and lateral flexion to release neck tension and improve mobility.',     'mobility', 'neck',        (SELECT id FROM categories WHERE slug = 'mobility'), 1, 60)
ON CONFLICT DO NOTHING;

-- STRENGTH
INSERT INTO exercises (name, slug, description, movement_pattern, body_region, category_id, min_level, max_level) VALUES
    ('Power Clean', 'power_clean', 'Olympic lift pulling barbell from floor to front rack in one explosive movement to develop total-bod', 'pull', 'full_body', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Hang Power Clean', 'hang_power_clean', 'Power clean initiated from mid-thigh to emphasize explosive hip extension and rate of force developm', 'pull', 'full_body', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Power Snatch', 'power_snatch', 'Wide-grip barbell pulled from floor to overhead in one movement to develop explosive full-body coord', 'pull', 'full_body', (SELECT id FROM categories WHERE slug = 'strength'), 60, 100),
    ('Hang Power Snatch', 'hang_power_snatch', 'Snatch initiated from mid-thigh focusing on violent hip extension and overhead stability.', 'pull', 'full_body', (SELECT id FROM categories WHERE slug = 'strength'), 60, 100),
    ('Push Press', 'push_press', 'Lower body drive used to press barbell overhead bridging leg power to upper body strength.', 'push', 'full_body', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Trap Bar Deadlift', 'trap_bar_deadlift', 'Deadlift using hex bar to reduce spinal load while maximizing leg and hip drive.', 'legs', 'full_body', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Conventional Deadlift', 'conventional_deadlift', 'Full-range hip hinge pull from floor to develop posterior chain strength and total force production.', 'pull', 'hamstring', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Sumo Deadlift', 'sumo_deadlift', 'Wide-stance hip-dominant deadlift variation to target adductors and glutes for lower body strength.', 'pull', 'hamstring', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Stiff Leg Deadlift', 'stiff_leg_deadlift', 'Minimal knee bend hip hinge to maximally load hamstrings through full range of motion.', 'pull', 'hamstring', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Reverse Lunge', 'reverse_lunge', 'Backward step lunge reducing knee stress while developing single-leg strength and balance.', 'legs', 'quad', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Nordic Hamstring Curl', 'nordic_hamstring_curl', 'Eccentric hamstring exercise with highest injury prevention effect for hamstring strains in sprinter', 'pull', 'hamstring', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Single Leg Calf Raise', 'single_leg_calf_raise', 'Unilateral ankle plantar flexion to develop Achilles tendon resilience and calf strength.', 'legs', 'calf', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Tibialis Raise', 'tibialis_raise', 'Dorsiflexion strengthening to prevent shin splints and support sprint mechanics.', 'legs', 'calf', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Wall Sit', 'wall_sit', 'Isometric quad hold at 90 degrees to build lower limb endurance and tendon tolerance.', 'isometric', 'full_body', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Reverse Hyperextension', 'reverse_hyperextension', 'Posterior chain extension on reverse hyper machine to decompress spine and strengthen glutes.', 'pull', 'hip', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('45 Degree Back Extension', 'back_extension_45deg', 'Controlled hip extension on back extension bench for glute and hamstring endurance.', 'pull', 'hip', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Copenhagen Plank', 'copenhagen_plank', 'Adductor-focused lateral plank for groin strength and hip stability in multi-directional sports.', 'isometric', 'groin', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Incline Dumbbell Press', 'incline_dumbbell_press', 'Angled press targeting upper chest and shoulder stability for overhead athletes.', 'push', 'full_body', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Landmine Press', 'landmine_press', 'Single-arm angled press from landmine to develop shoulder strength with reduced impingement risk.', 'push', 'shoulder', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Weighted Pull-Up', 'weighted_pull_up', 'Vertical pull with added load to maximize lat and upper-back strength.', 'pull', 'upper_back', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Dumbbell Row', 'dumbbell_row', 'Unilateral horizontal pull to address strength imbalances and build lat and mid-back.', 'pull', 'upper_back', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Band Pull-Apart', 'band_pull_apart', 'Horizontal band stretch to activate rear delts and mid-back for shoulder health.', 'pull', 'upper_back', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Scapular Pull-Up', 'scapular_pull_up', 'Hanging retraction and depression of scapulae to activate lower traps and protect shoulder joint.', 'pull', 'upper_back', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Dead Bug', 'dead_bug', 'Contralateral limb extension from supine to build deep core stability and coordination.', 'core', 'core', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Bird Dog', 'bird_dog', 'Quadruped contralateral extension to develop lumbar stability and hip extension control.', 'core', 'core', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Ab Wheel Rollout', 'ab_wheel_rollout', 'Anti-extension core exercise rolling out from kneeling to challenge spinal stability at end range.', 'core', 'core', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Cable Chop', 'cable_chop', 'Rotational core pattern from high to low mimicking athletic trunk rotation demands.', 'core', 'core', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Hanging Leg Raise', 'hanging_leg_raise', 'Hip flexion from dead hang to develop lower abdominal and hip flexor strength.', 'core', 'quad', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Copenhagen Hip Adduction', 'copenhagen_hip_adduction', 'Lateral bridge with top leg on bench to develop adductor strength and reduce groin injury risk.', 'isometric', 'hip', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Farmers Walk', 'farmers_walk', 'Loaded bilateral carry to build grip and core stability under real movement demands.', 'isometric', 'full_body', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Suitcase Carry', 'suitcase_carry', 'Unilateral loaded carry to challenge lateral core stability and hip alignment.', 'isometric', 'hip', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Isometric Mid-Thigh Pull', 'isometric_mid_thigh_pull', 'Max effort isometric pull against immovable barbell to develop neural drive and peak force.', 'pull', 'full_body', (SELECT id FROM categories WHERE slug = 'strength'), 60, 100),
    ('Single Leg Glute Bridge', 'single_leg_glute_bridge', 'Unilateral hip extension from floor to improve glute activation and hip stability.', 'legs', 'glute', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Banded Monster Walk', 'banded_monster_walk', 'Lateral resistance band walk to activate hip abductors and gluteus medius before lower body work.', 'legs', 'glute', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Lateral Band Walk', 'lateral_band_walk', 'Side-step with resistance band above knees to reinforce knee alignment and abductor strength.', 'legs', 'full_body', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Banded Clamshell', 'banded_clamshell', 'Sidelying hip external rotation against resistance to develop gluteus medius and reduce knee valgus.', 'legs', 'glute', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Wide Grip Push-Up', 'wide_grip_push_up', 'Wider hand placement increasing chest activation and range of motion in horizontal push.', 'push', 'chest', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Diamond Push-Up', 'diamond_push_up', 'Narrow tricep-focused push-up with hands forming a diamond shape under the chest.', 'push', 'chest', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Decline Push-Up', 'decline_push_up', 'Feet elevated push-up to shift load to upper chest and anterior deltoid.', 'push', 'chest', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Archer Push-Up', 'archer_push_up', 'Unilateral loading push-up shifting weight to one arm to build single-arm strength.', 'push', 'chest', (SELECT id FROM categories WHERE slug = 'strength'), 60, 100),
    ('Pike Push-Up', 'pike_push_up', 'Downward dog push-up targeting shoulders as a progression toward handstand pressing.', 'push', 'shoulder', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Shoulder Tap Push-Up', 'shoulder_tap_push_up', 'Push-up with alternating shoulder taps to develop anti-rotation core stability.', 'push', 'shoulder', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Dip (Tricep)', 'tricep_dip', 'Upper body pressing movement off parallel bars or sturdy chairs developing triceps and chest.', 'push', 'tricep', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Negative Pull-Up', 'negative_pull_up', 'Slow eccentric lowering from chin over bar to build pulling strength for beginners.', 'pull', 'upper_back', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Bodyweight Squat', 'bodyweight_squat', 'Fundamental squat pattern without load to develop mobility and movement quality.', 'legs', 'quad', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Pistol Squat', 'pistol_squat', 'Single-leg full depth squat requiring strength, balance and ankle mobility.', 'legs', 'quad', (SELECT id FROM categories WHERE slug = 'strength'), 60, 100),
    ('Assisted Pistol Squat', 'assisted_pistol_squat', 'Single-leg squat holding a support for balance as a progression toward the full pistol.', 'legs', 'quad', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Split Squat', 'split_squat', 'Stationary lunge position squat developing unilateral leg strength without equipment.', 'legs', 'quad', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Walking Lunge', 'walking_lunge', 'Forward stepping lunge developing single-leg strength and dynamic hip stability.', 'legs', 'quad', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Lateral Lunge', 'lateral_lunge', 'Side-step lunge developing adductor strength and hip mobility in the frontal plane.', 'legs', 'quad', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Wall-Supported Hamstring Curl', 'wall_supported_hamstring_curl', 'Prone hip extension curl using a wall for anchoring to develop hamstring strength at home.', 'legs', 'hamstring', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Donkey Kick', 'donkey_kick', 'Quadruped hip extension to isolate and activate glute max in a home-friendly position.', 'legs', 'full_body', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Fire Hydrant', 'fire_hydrant', 'Quadruped hip abduction to activate gluteus medius and improve hip external rotation.', 'legs', 'hip', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Standing Hip Abduction', 'standing_hip_abduction', 'Standing lateral leg raise to develop hip abductor strength and pelvic stability.', 'legs', 'hip', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Standing Hip Extension', 'standing_hip_extension', 'Standing backward leg raise to activate glutes and reinforce hip extension mechanics.', 'legs', 'hip', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Calf Raise (Bilateral)', 'calf_raise_bilateral', 'Two-leg heel raise to develop calf and Achilles tendon strength and endurance.', 'legs', 'calf', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Sumo Squat', 'sumo_squat', 'Wide-stance bodyweight squat targeting inner thighs and glutes with upright torso.', 'legs', 'quad', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Hollow Body Hold', 'hollow_body_hold', 'Supine full-body tension position developing anterior core and body awareness for athletic movements', 'isometric', 'core', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('V-Up', 'v_up', 'Full sit-up reaching hands to feet to develop dynamic core flexion strength.', 'core', 'core', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Reverse Crunch', 'reverse_crunch', 'Lying hip raise curling knees to chest to develop lower abdominal and hip flexor strength.', 'core', 'core', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Bicycle Crunch', 'bicycle_crunch', 'Alternating elbow-to-knee crunch developing oblique strength and rotational core stability.', 'core', 'core', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Superman Hold', 'superman_hold', 'Prone simultaneous limb raise to develop erector spinae and posterior chain endurance.', 'isometric', 'lower_back', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Mountain Climber', 'mountain_climber', 'Plank-position alternating knee drives developing core stability and cardiovascular conditioning.', 'core', 'core', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Spiderman Plank', 'spiderman_plank', 'Plank with alternating knee-to-elbow drives developing rotational core strength and hip mobility.', 'core', 'core', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Toe Touch Crunch', 'toe_touch_crunch', 'Lying leg-raise crunch combination to develop full anterior core chain.', 'core', 'core', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Banded Squat', 'banded_squat', 'Bodyweight squat with band above knees to cue knee alignment and activate glutes.', 'legs', 'quad', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Banded Hip Thrust', 'banded_hip_thrust', 'Glute bridge with resistance band across hips for progressive overload without gym.', 'legs', 'hip', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Banded Romanian Deadlift', 'banded_romanian_deadlift', 'Hip hinge with band underfoot to develop hamstring and glute strength without a barbell.', 'pull', 'hamstring', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Banded Row', 'banded_row', 'Horizontal pull with resistance band anchored to door to develop upper back strength at home.', 'pull', 'upper_back', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Banded Overhead Press', 'banded_overhead_press', 'Vertical press standing on band to develop shoulder strength without dumbbells or barbell.', 'push', 'full_body', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Banded Lateral Raise', 'banded_lateral_raise', 'Side raise against band resistance to develop lateral deltoid and shoulder stability.', 'push', 'full_body', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Banded Good Morning', 'banded_good_morning', 'Hip hinge with band for posterior chain activation and hamstring warm-up.', 'pull', 'hamstring', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Banded Face Pull', 'banded_face_pull', 'Band face pull anchored to door to strengthen rear delts and external rotators at home.', 'pull', 'full_body', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Banded Kickback', 'banded_kickback', 'Hip extension with band for glute isolation and activation in a home setting.', 'legs', 'glute', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Banded Bicycle', 'banded_bicycle', 'Lying bicycle crunch with resistance band for added core and hip flexor challenge.', 'core', 'core', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Banded Chest Press (Floor)', 'banded_chest_press_floor', 'Floor press with band anchored behind to develop chest strength without bench or barbell.', 'push', 'chest', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Dumbbell Thruster', 'dumbbell_thruster', 'Squat to overhead press in one movement to develop full-body conditioning and power.', 'legs', 'full_body', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Dumbbell Romanian Deadlift', 'dumbbell_rdl', 'Bilateral hip hinge with dumbbells targeting hamstrings and glutes without a barbell.', 'pull', 'hamstring', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Dumbbell Lateral Lunge', 'dumbbell_lateral_lunge', 'Side lunge holding dumbbell for added resistance in frontal plane strength.', 'legs', 'quad', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Dumbbell Step-Up to Press', 'dumbbell_step_up_to_press', 'Step-up combined with overhead press to develop single-leg drive and upper body strength.', 'legs', 'quad', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Dumbbell Curl to Press', 'dumbbell_curl_to_press', 'Bicep curl into overhead press developing arm strength and shoulder stability.', 'push', 'full_body', (SELECT id FROM categories WHERE slug = 'strength'), 1, 30),
    ('Renegade Row', 'renegade_row', 'Push-up position alternating row to develop upper back strength and anti-rotation core stability.', 'pull', 'upper_back', (SELECT id FROM categories WHERE slug = 'strength'), 60, 100),
    ('Dumbbell Floor Press', 'dumbbell_floor_press', 'Chest press lying on floor developing pressing strength with limited shoulder extension.', 'push', 'full_body', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60),
    ('Dumbbell Hip Hinge Row', 'dumbbell_hip_hinge_row', 'Hinged position dumbbell row to simultaneously load posterior chain and upper back.', 'pull', 'upper_back', (SELECT id FROM categories WHERE slug = 'strength'), 30, 60),
    ('Dumbbell Goblet Reverse Lunge', 'dumbbell_goblet_reverse_lunge', 'Reverse lunge holding dumbbell at chest for added load and core stability.', 'legs', 'quad', (SELECT id FROM categories WHERE slug = 'strength'), 1, 60)
ON CONFLICT DO NOTHING;

-- UPPER BODY EXPLOSIVITY
INSERT INTO exercises (name, slug, description, movement_pattern, body_region, category_id, min_level, max_level) VALUES
    ('Medicine Ball Slam', 'medicine_ball_slam', 'Overhead to ground explosive throw to develop trunk power and triple extension strength.', 'core', 'full_body', (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics'), 1, 60),
    ('Rotational Med Ball Throw', 'rotational_med_ball_throw', 'Side rotational throw against wall to develop rotational power transferable to sport movements.', 'core', 'upper_back', (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics'), 1, 60),
    ('Med Ball Chest Pass', 'med_ball_chest_pass', 'Explosive bilateral chest throw to develop upper-body horizontal pushing power.', 'push', 'chest', (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics'), 1, 60),
    ('Med Ball Overhead Throw', 'med_ball_overhead_throw', 'Two-hand overhead throw forward to develop core and hip extension power.', 'push', 'upper_back', (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics'), 30, 60),
    ('Med Ball Scoop Toss', 'med_ball_scoop_toss', 'Rapid upward hip extension toss simulating jump mechanics for clean power transfer.', 'legs', 'full_body', (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics'), 30, 60)
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- Equipment mappings for new exercises
-- ─────────────────────────────────────────────────────────────

INSERT INTO exercise_equipments (exercise_id, equipment_id)
SELECT ex.id, eq.id FROM exercises ex, equipments eq WHERE
    (ex.slug = 'drop_jump' AND eq.slug = 'plyo_box') OR
    (ex.slug = 'power_clean' AND eq.slug = 'barbell') OR
    (ex.slug = 'hang_power_clean' AND eq.slug = 'barbell') OR
    (ex.slug = 'power_snatch' AND eq.slug = 'barbell') OR
    (ex.slug = 'hang_power_snatch' AND eq.slug = 'barbell') OR
    (ex.slug = 'push_press' AND eq.slug = 'barbell') OR
    (ex.slug = 'trap_bar_deadlift' AND eq.slug = 'trap_bar') OR
    (ex.slug = 'conventional_deadlift' AND eq.slug = 'barbell') OR
    (ex.slug = 'sumo_deadlift' AND eq.slug = 'barbell') OR
    (ex.slug = 'stiff_leg_deadlift' AND eq.slug = 'barbell') OR
    (ex.slug = 'reverse_lunge' AND eq.slug = 'dumbbell') OR
    (ex.slug = 'incline_dumbbell_press' AND eq.slug = 'dumbbell') OR
    (ex.slug = 'landmine_press' AND eq.slug = 'barbell') OR
    (ex.slug = 'weighted_pull_up' AND eq.slug = 'pull_up_bar') OR
    (ex.slug = 'dumbbell_row' AND eq.slug = 'dumbbell') OR
    (ex.slug = 'band_pull_apart' AND eq.slug = 'resistance_band') OR
    (ex.slug = 'scapular_pull_up' AND eq.slug = 'pull_up_bar') OR
    (ex.slug = 'hanging_leg_raise' AND eq.slug = 'pull_up_bar') OR
    (ex.slug = 'farmers_walk' AND eq.slug = 'dumbbell') OR
    (ex.slug = 'suitcase_carry' AND eq.slug = 'dumbbell') OR
    (ex.slug = 'isometric_mid_thigh_pull' AND eq.slug = 'barbell') OR
    (ex.slug = 'sled_push' AND eq.slug = 'sled') OR
    (ex.slug = 'sled_pull' AND eq.slug = 'sled') OR
    (ex.slug = 'resisted_sprint' AND eq.slug = 'sled') OR
    (ex.slug = 'sprint_parachute_run' AND eq.slug = 'sprint_parachute') OR
    (ex.slug = 'prowler_push_sprint' AND eq.slug = 'sled') OR
    (ex.slug = 'banded_hip_flexor_march' AND eq.slug = 'resistance_band') OR
    (ex.slug = 'medicine_ball_slam' AND eq.slug = 'medicine_ball') OR
    (ex.slug = 'rotational_med_ball_throw' AND eq.slug = 'medicine_ball') OR
    (ex.slug = 'med_ball_chest_pass' AND eq.slug = 'medicine_ball') OR
    (ex.slug = 'med_ball_overhead_throw' AND eq.slug = 'medicine_ball') OR
    (ex.slug = 'med_ball_scoop_toss' AND eq.slug = 'medicine_ball') OR
    (ex.slug = 'banded_monster_walk' AND eq.slug = 'resistance_band') OR
    (ex.slug = 'lateral_band_walk' AND eq.slug = 'resistance_band') OR
    (ex.slug = 'banded_clamshell' AND eq.slug = 'resistance_band') OR
    (ex.slug = 'banded_ankle_distraction' AND eq.slug = 'resistance_band') OR
    (ex.slug = 'thoracic_foam_roll' AND eq.slug = 'foam_roller') OR
    (ex.slug = 'lat_foam_roll' AND eq.slug = 'foam_roller') OR
    (ex.slug = 'quad_foam_roll' AND eq.slug = 'foam_roller') OR
    (ex.slug = 'hamstring_foam_roll' AND eq.slug = 'foam_roller') OR
    (ex.slug = 'it_band_foam_roll' AND eq.slug = 'foam_roller') OR
    (ex.slug = 'glute_foam_roll' AND eq.slug = 'foam_roller') OR
    (ex.slug = 'negative_pull_up' AND eq.slug = 'pull_up_bar') OR
    (ex.slug = 'banded_squat' AND eq.slug = 'resistance_band') OR
    (ex.slug = 'banded_hip_thrust' AND eq.slug = 'resistance_band') OR
    (ex.slug = 'banded_romanian_deadlift' AND eq.slug = 'resistance_band') OR
    (ex.slug = 'banded_row' AND eq.slug = 'resistance_band') OR
    (ex.slug = 'banded_overhead_press' AND eq.slug = 'resistance_band') OR
    (ex.slug = 'banded_lateral_raise' AND eq.slug = 'resistance_band') OR
    (ex.slug = 'banded_good_morning' AND eq.slug = 'resistance_band') OR
    (ex.slug = 'banded_face_pull' AND eq.slug = 'resistance_band') OR
    (ex.slug = 'banded_kickback' AND eq.slug = 'resistance_band') OR
    (ex.slug = 'banded_bicycle' AND eq.slug = 'resistance_band') OR
    (ex.slug = 'banded_chest_press_floor' AND eq.slug = 'resistance_band') OR
    (ex.slug = 'banded_sprint_resistance_run' AND eq.slug = 'resistance_band') OR
    (ex.slug = 'dumbbell_thruster' AND eq.slug = 'dumbbell') OR
    (ex.slug = 'dumbbell_snatch' AND eq.slug = 'dumbbell') OR
    (ex.slug = 'dumbbell_clean' AND eq.slug = 'dumbbell') OR
    (ex.slug = 'dumbbell_rdl' AND eq.slug = 'dumbbell') OR
    (ex.slug = 'dumbbell_lateral_lunge' AND eq.slug = 'dumbbell') OR
    (ex.slug = 'dumbbell_step_up_to_press' AND eq.slug = 'dumbbell') OR
    (ex.slug = 'dumbbell_curl_to_press' AND eq.slug = 'dumbbell') OR
    (ex.slug = 'renegade_row' AND eq.slug = 'dumbbell') OR
    (ex.slug = 'dumbbell_floor_press' AND eq.slug = 'dumbbell') OR
    (ex.slug = 'dumbbell_hip_hinge_row' AND eq.slug = 'dumbbell') OR
    (ex.slug = 'dumbbell_swing' AND eq.slug = 'dumbbell') OR
    (ex.slug = 'dumbbell_goblet_reverse_lunge' AND eq.slug = 'dumbbell') OR

    -- Agility ladder
    (ex.slug = 'agility_ladder_ickey_shuffle'   AND eq.slug = 'agility_ladder') OR
    (ex.slug = 'agility_ladder_single_leg_hops' AND eq.slug = 'agility_ladder') OR

    -- Agility cones
    (ex.slug = 'pro_agility_shuttle' AND eq.slug = 'agility_cones') OR
    (ex.slug = 't_drill'             AND eq.slug = 'agility_cones') OR

    -- Jump rope
    (ex.slug = 'jump_rope_standard'    AND eq.slug = 'jump_rope') OR
    (ex.slug = 'jump_rope_double_under' AND eq.slug = 'jump_rope') OR

    -- Mini hurdles
    (ex.slug = 'hurdle_hops'        AND eq.slug = 'mini_hurdles') OR
    (ex.slug = 'lateral_hurdle_hop' AND eq.slug = 'mini_hurdles') OR

    -- Ab wheel
    (ex.slug = 'ab_wheel_rollout' AND eq.slug = 'ab_wheel') OR

    -- Back extension bench
    (ex.slug = 'reverse_hyperextension' AND eq.slug = 'back_extension_bench') OR
    (ex.slug = 'back_extension_45deg'   AND eq.slug = 'back_extension_bench') OR

    -- Bench (body support)
    (ex.slug = 'copenhagen_plank'         AND eq.slug = 'bench') OR
    (ex.slug = 'copenhagen_hip_adduction' AND eq.slug = 'bench') OR

    -- Dip bar
    (ex.slug = 'tricep_dip' AND eq.slug = 'dip_bar') OR

    -- Resistance band (sprint variation)
    (ex.slug = 'banded_sprint_resistance_run' AND eq.slug = 'resistance_band') OR

    -- Cable machine
    (ex.slug = 'cable_chop' AND eq.slug = 'cable_machine')

ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- Block type mappings for new exercises
-- ─────────────────────────────────────────────────────────────

INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN ('stiff_leg_deadlift', 'reverse_lunge', 'single_leg_calf_raise', 'tibialis_raise', 'wall_sit', 'back_extension_45deg', 'copenhagen_plank', 'incline_dumbbell_press', 'landmine_press', 'dumbbell_row', 'ab_wheel_rollout', 'hanging_leg_raise', 'copenhagen_hip_adduction', 'suitcase_carry', 'wide_grip_push_up', 'diamond_push_up', 'decline_push_up', 'archer_push_up', 'pike_push_up', 'shoulder_tap_push_up', 'negative_pull_up', 'assisted_pistol_squat', 'split_squat', 'wall_supported_hamstring_curl', 'hollow_body_hold', 'v_up', 'reverse_crunch', 'bicycle_crunch', 'spiderman_plank', 'toe_touch_crunch', 'banded_romanian_deadlift', 'banded_row', 'banded_overhead_press', 'banded_lateral_raise', 'banded_bicycle', 'banded_chest_press_floor', 'dumbbell_rdl', 'dumbbell_lateral_lunge', 'dumbbell_step_up_to_press', 'dumbbell_curl_to_press', 'renegade_row', 'dumbbell_floor_press', 'dumbbell_hip_hinge_row', 'dumbbell_goblet_reverse_lunge')
AND bt.slug IN ('accessory')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN ('reverse_hyperextension', 'banded_face_pull')
AND bt.slug IN ('accessory', 'cooldown')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN ('lateral_bounds', 'lateral_hurdle_hop', 'nordic_hamstring_curl', 'farmers_walk', 'sled_push', 'sled_pull', 'tricep_dip', 'jump_squat', 'pistol_squat', 'banded_hip_thrust')
AND bt.slug IN ('accessory', 'primary', 'secondary')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN ('band_pull_apart', 'dead_bug', 'bird_dog', 'cable_chop', 'banded_hip_flexor_march', 'reactive_drop_catch', 'single_leg_glute_bridge', 'banded_clamshell', 'bodyweight_squat', 'walking_lunge', 'lateral_lunge', 'donkey_kick', 'standing_hip_abduction', 'standing_hip_extension', 'calf_raise_bilateral', 'sumo_squat', 'superman_hold', 'banded_squat', 'banded_good_morning', 'banded_kickback')
AND bt.slug IN ('accessory', 'warmup')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN ('standing_quad_stretch', 'doorway_chest_stretch', 'childs_pose', 'supine_twist', 'yoga_sun_salutation', 'standing_calf_stretch', 'seated_piriformis_stretch', 'upper_trap_stretch')
AND bt.slug IN ('cooldown')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN ('hip_cars', 'shoulder_cars', 'ankle_cars', 'hip_90_90_stretch', 'hip_flexor_lunge_stretch', 'kneeling_adductor_stretch', 'thoracic_foam_roll', 'lat_foam_roll', 'quad_foam_roll', 'hamstring_foam_roll', 'it_band_foam_roll', 'glute_foam_roll', 'diaphragmatic_breathing', 'box_breathing', 'cat_cow_stretch', 'thread_the_needle', 'prone_hip_internal_rotation', 'wrist_mobility_circles', 'thoracic_extension_chair', 'standing_spinal_rotation', 'neck_circles')
AND bt.slug IN ('cooldown', 'warmup')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN ('drop_jump', 'hang_power_clean', 'power_snatch', 'hang_power_snatch', 'push_press', 'trap_bar_deadlift', 'conventional_deadlift', 'sumo_deadlift', 'weighted_pull_up', 'isometric_mid_thigh_pull', 'resisted_sprint', 'sprint_parachute_run', 'flying_20_sprint', 'prowler_push_sprint', 'sprint_start_blocks', 'pro_agility_shuttle', 't_drill', 'med_ball_overhead_throw', 'med_ball_scoop_toss', 'squat_jump_to_stick', 'burpee_broad_jump', 'stair_sprint', 'banded_sprint_resistance_run', 'dumbbell_thruster', 'dumbbell_snatch', 'dumbbell_clean')
AND bt.slug IN ('primary', 'secondary')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN ('hurdle_hops', 'pogos', 'power_clean', 'acceleration_sprint_10m', 'agility_ladder_ickey_shuffle', 'agility_ladder_single_leg_hops', 'medicine_ball_slam', 'rotational_med_ball_throw', 'med_ball_chest_pass', 'jump_rope_double_under', 'mountain_climber', 'burpee', 'bear_crawl', 'lateral_shuffle', 'shadow_boxing', 'star_jump', 'sprint_in_place', 'dumbbell_swing')
AND bt.slug IN ('primary', 'secondary', 'warmup')
ON CONFLICT DO NOTHING;

INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id FROM exercises ex, block_types bt
WHERE ex.slug IN ('scapular_pull_up', 'a_skip_drill', 'b_skip_drill', 'high_knees', 'butt_kicks', 'wall_drill_march', 'banded_monster_walk', 'lateral_band_walk', 'jump_rope_standard', 'worlds_greatest_stretch', 'banded_ankle_distraction', 'leg_swing_front_to_back', 'leg_swing_side_to_side', 'arm_circle', 'fire_hydrant', 'jumping_jacks')
AND bt.slug IN ('warmup')
ON CONFLICT DO NOTHING;