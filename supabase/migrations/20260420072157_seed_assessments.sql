-- ─────────────────────────────────────────────────────────────
-- Assessments
-- ─────────────────────────────────────────────────────────────

INSERT INTO assessments (slug, name, description, measured_metric_id, min_level, max_level, category_id) VALUES

    -- Strength: 1RM
    ('back_squat_1rm',
     'Back Squat 1RM',
     'Find your 1-rep max on the back squat. Work up gradually with sufficient rest between attempts.',
     (SELECT id FROM metrics WHERE slug = 'back_squat_1rm'),
     20, 100,
     (SELECT id FROM categories WHERE slug = 'strength')),

    ('hip_thrust_1rm',
     'Hip Thrust 1RM',
     'Find your 1-rep max on the barbell hip thrust.',
     (SELECT id FROM metrics WHERE slug = 'hip_thrust_1rm'),
     10, 100,
     (SELECT id FROM categories WHERE slug = 'strength')),

    ('romanian_deadlift_1rm',
     'Romanian Deadlift 1RM',
     'Find your 1-rep max on the Romanian deadlift. Maintain neutral spine throughout.',
     (SELECT id FROM metrics WHERE slug = 'romanian_deadlift_1rm'),
     15, 100,
     (SELECT id FROM categories WHERE slug = 'strength')),

    ('bench_press_1rm',
     'Bench Press 1RM',
     'Find your 1-rep max on the flat barbell bench press.',
     (SELECT id FROM metrics WHERE slug = 'bench_press_1rm'),
     15, 100,
     (SELECT id FROM categories WHERE slug = 'strength')),

    ('weighted_pullups_1rm',
     'Weighted Pull-up 1RM',
     'Find your 1-rep max on the pull-up with added weight via belt or vest.',
     (SELECT id FROM metrics WHERE slug = 'weighted_pullups_1rm'),
     50, 100,
     (SELECT id FROM categories WHERE slug = 'strength')),

    -- Strength: max reps
    ('max_pushups',
     'Max Push-ups',
     'Perform as many push-ups as possible in one unbroken set. Full range of motion required.',
     (SELECT id FROM metrics WHERE slug = 'max_pushups'),
     1, 100,
     (SELECT id FROM categories WHERE slug = 'strength')),

    ('max_pullups',
     'Max Pull-ups',
     'Perform as many strict pull-ups as possible in one unbroken set.',
     (SELECT id FROM metrics WHERE slug = 'max_pullups'),
     20, 100,
     (SELECT id FROM categories WHERE slug = 'strength')),

    ('max_dips',
     'Max Dips',
     'Perform as many strict dips as possible in one unbroken set.',
     (SELECT id FROM metrics WHERE slug = 'max_dips'),
     20, 100,
     (SELECT id FROM categories WHERE slug = 'strength')),

    -- Jumps
    ('vertical_jump',
     'Vertical Jump',
     'Jump as high as possible from a standing position. Measure height reached in cm.',
     (SELECT id FROM metrics WHERE slug = 'vertical_jump_height_cm'),
     1, 100,
     (SELECT id FROM categories WHERE slug = 'jumps')),

    ('broad_jump',
     'Broad Jump',
     'Jump as far as possible horizontally from a standing position. Measure distance in cm.',
     (SELECT id FROM metrics WHERE slug = 'broad_jump_distance_cm'),
     1, 100,
     (SELECT id FROM categories WHERE slug = 'jumps')),

    ('box_jump',
     'Box Jump',
     'Jump onto the highest box you can land cleanly and safely. Record box height in cm.',
     (SELECT id FROM metrics WHERE slug = 'box_jump_height_cm'),
     30, 100,
     (SELECT id FROM categories WHERE slug = 'jumps')),

    -- Lower body explosivity
    ('sprint_10m',
     '10m Sprint',
     'Sprint 10 meters from a standing start. Record time in seconds.',
     (SELECT id FROM metrics WHERE slug = '10m_sprint_time'),
     1, 100,
     (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics')),

    ('sprint_30m',
     '30m Sprint',
     'Sprint 30 meters from a standing start. Record time in seconds.',
     (SELECT id FROM metrics WHERE slug = '30m_sprint_time'),
     1, 100,
     (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics')),

    ('sprint_10m_flying',
     '10m Flying Sprint',
     'Sprint 10 meters with a rolling start. Isolates pure top-end speed.',
     (SELECT id FROM metrics WHERE slug = '10m_sprint_flying_time'),
     40, 100,
     (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics')),

    ('agility_505',
     '505 Agility Test',
     'Sprint 5m, touch the line, turn 180° and sprint back 5m. Record total time in seconds.',
     (SELECT id FROM metrics WHERE slug = '505_agility_time'),
     20, 100,
     (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics')),

    -- Upper body explosivity
    ('mb_chest_throw',
     'Medicine Ball Chest Throw',
     'Standing chest pass throw with a medicine ball. Record distance in cm.',
     (SELECT id FROM metrics WHERE slug = 'mb_chest_throw_distance_cm'),
     1, 100,
     (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics')),

    ('mb_rotational_throw',
     'Medicine Ball Rotational Throw',
     'Rotational side throw against a wall or open space. Record distance in cm.',
     (SELECT id FROM metrics WHERE slug = 'mb_rotational_throw_distance_cm'),
     1, 100,
     (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics')),

    ('mb_overhead_throw',
     'Medicine Ball Overhead Throw',
     'Two-hand overhead throw for distance. Record distance in cm.',
     (SELECT id FROM metrics WHERE slug = 'mb_overhead_throw_distance_cm'),
     1, 100,
     (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics')),

    ('clap_pushups',
     'Clap Push-ups',
     'Perform as many clap push-ups as possible. Full extension required at top.',
     (SELECT id FROM metrics WHERE slug = 'max_clap_pushups'),
     30, 100,
     (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics'));

-- ─────────────────────────────────────────────────────────────
-- Assessment ↔ Equipment mappings
-- ─────────────────────────────────────────────────────────────

INSERT INTO assessment_equipments (assessment_id, equipment_id)
SELECT a.id, eq.id FROM assessments a, equipments eq WHERE
    (a.slug = 'back_squat_1rm'       AND eq.slug = 'barbell') OR
    (a.slug = 'hip_thrust_1rm'       AND eq.slug = 'barbell') OR
    (a.slug = 'romanian_deadlift_1rm' AND eq.slug = 'barbell') OR
    (a.slug = 'bench_press_1rm'      AND eq.slug = 'barbell') OR
    (a.slug = 'weighted_pullups_1rm' AND eq.slug = 'pull_up_bar') OR
    (a.slug = 'max_pullups'          AND eq.slug = 'pull_up_bar') OR
    (a.slug = 'max_dips'             AND eq.slug = 'dip_bar') OR
    (a.slug = 'box_jump'             AND eq.slug = 'plyo_box') OR
    (a.slug = 'mb_chest_throw'       AND eq.slug = 'medicine_ball') OR
    (a.slug = 'mb_rotational_throw'  AND eq.slug = 'medicine_ball') OR
    (a.slug = 'mb_overhead_throw'    AND eq.slug = 'medicine_ball');
