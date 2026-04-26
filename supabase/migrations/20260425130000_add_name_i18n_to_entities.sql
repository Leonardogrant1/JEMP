-- Add name_i18n to assessments, equipments, environments
ALTER TABLE assessments  ADD COLUMN IF NOT EXISTS name_i18n JSONB;
ALTER TABLE equipments   ADD COLUMN IF NOT EXISTS name_i18n JSONB;
ALTER TABLE environments ADD COLUMN IF NOT EXISTS name_i18n JSONB;
ALTER TABLE environments ADD COLUMN IF NOT EXISTS description_i18n JSONB;

-- ─────────────────────────────────────────────────────────────
-- Environments
-- ─────────────────────────────────────────────────────────────
UPDATE environments AS e
SET
    name_i18n        = v.name,
    description_i18n = v.description
FROM (VALUES
    ('gym',     jsonb_build_object('en', 'Gym',     'de', 'Fitnessstudio'),
                jsonb_build_object('en', 'Full equipment setup', 'de', 'Vollständige Ausstattung')),
    ('outdoor', jsonb_build_object('en', 'Outdoor', 'de', 'Outdoor'),
                jsonb_build_object('en', 'Parks & sports fields', 'de', 'Parks & Sportplätze')),
    ('home',    jsonb_build_object('en', 'Home',    'de', 'Zuhause'),
                jsonb_build_object('en', 'Home training', 'de', 'Heimtraining'))
) AS v(slug, name, description)
WHERE e.slug = v.slug;

-- ─────────────────────────────────────────────────────────────
-- Equipments
-- ─────────────────────────────────────────────────────────────
UPDATE equipments AS eq
SET name_i18n = v.name
FROM (VALUES
    ('barbell',               jsonb_build_object('en', 'Barbell',               'de', 'Langhantel')),
    ('dumbbell',              jsonb_build_object('en', 'Dumbbell',              'de', 'Kurzhantel')),
    ('kettlebell',            jsonb_build_object('en', 'Kettlebell',            'de', 'Kettlebell')),
    ('weight_belt',           jsonb_build_object('en', 'Weight Belt',           'de', 'Gewichtsgürtel')),
    ('squat_rack',            jsonb_build_object('en', 'Squat Rack',            'de', 'Kniebeuge-Rack')),
    ('bench',                 jsonb_build_object('en', 'Bench',                 'de', 'Bank')),
    ('incline_bench',         jsonb_build_object('en', 'Incline Bench',         'de', 'Schrägbank')),
    ('pull_up_bar',           jsonb_build_object('en', 'Pull-Up Bar',           'de', 'Klimmzugstange')),
    ('dip_bar',               jsonb_build_object('en', 'Dip Bar',               'de', 'Dip-Barren')),
    ('cable_machine',         jsonb_build_object('en', 'Cable Machine',         'de', 'Kabelzug')),
    ('plyo_box',              jsonb_build_object('en', 'Plyo Box',              'de', 'Plyo-Box')),
    ('medicine_ball',         jsonb_build_object('en', 'Medicine Ball',         'de', 'Medizinball')),
    ('agility_cones',         jsonb_build_object('en', 'Agility Cones',         'de', 'Hütchen')),
    ('agility_ladder',        jsonb_build_object('en', 'Agility Ladder',        'de', 'Koordinationsleiter')),
    ('sled',                  jsonb_build_object('en', 'Sled',                  'de', 'Schlitten')),
    ('sprint_parachute',      jsonb_build_object('en', 'Sprint Parachute',      'de', 'Sprintfallschirm')),
    ('jump_rope',             jsonb_build_object('en', 'Jump Rope',             'de', 'Springseil')),
    ('mini_hurdles',          jsonb_build_object('en', 'Mini Hurdles',          'de', 'Mini-Hürden')),
    ('back_extension_bench',  jsonb_build_object('en', 'Back Extension Bench',  'de', 'Rückenstrecker-Bank')),
    ('ab_wheel',              jsonb_build_object('en', 'Ab Wheel',              'de', 'Ab-Wheel')),
    ('trap_bar',              jsonb_build_object('en', 'Trap Bar',              'de', 'Trap Bar')),
    ('resistance_band',       jsonb_build_object('en', 'Resistance Band',       'de', 'Widerstandsband')),
    ('foam_roller',           jsonb_build_object('en', 'Foam Roller',           'de', 'Faszienrolle'))
) AS v(slug, name)
WHERE eq.slug = v.slug;

-- ─────────────────────────────────────────────────────────────
-- Assessment names
-- ─────────────────────────────────────────────────────────────
UPDATE assessments AS a
SET name_i18n = v.name
FROM (VALUES
    ('back_squat_1rm',         jsonb_build_object('en', 'Back Squat 1RM',                    'de', 'Kniebeuge 1WH')),
    ('hip_thrust_1rm',         jsonb_build_object('en', 'Hip Thrust 1RM',                    'de', 'Hip Thrust 1WH')),
    ('romanian_deadlift_1rm',  jsonb_build_object('en', 'Romanian Deadlift 1RM',             'de', 'Rumänisches Kreuzheben 1WH')),
    ('bench_press_1rm',        jsonb_build_object('en', 'Bench Press 1RM',                   'de', 'Bankdrücken 1WH')),
    ('weighted_pullups_1rm',   jsonb_build_object('en', 'Weighted Pull-up 1RM',              'de', 'Gewichteter Klimmzug 1WH')),
    ('max_pushups',            jsonb_build_object('en', 'Max Push-ups',                      'de', 'Maximale Liegestütze')),
    ('max_pullups',            jsonb_build_object('en', 'Max Pull-ups',                      'de', 'Maximale Klimmzüge')),
    ('max_dips',               jsonb_build_object('en', 'Max Dips',                          'de', 'Maximale Dips')),
    ('vertical_jump',          jsonb_build_object('en', 'Vertical Jump',                     'de', 'Vertikalsprung')),
    ('broad_jump',             jsonb_build_object('en', 'Broad Jump',                        'de', 'Weitsprung')),
    ('box_jump',               jsonb_build_object('en', 'Box Jump',                          'de', 'Box Jump')),
    ('sprint_10m',             jsonb_build_object('en', '10m Sprint',                        'de', '10m Sprint')),
    ('sprint_30m',             jsonb_build_object('en', '30m Sprint',                        'de', '30m Sprint')),
    ('sprint_10m_flying',      jsonb_build_object('en', '10m Flying Sprint',                 'de', '10m Fliegender Sprint')),
    ('agility_505',            jsonb_build_object('en', '505 Agility Test',                  'de', '505 Agilitätstest')),
    ('mb_chest_throw',         jsonb_build_object('en', 'Medicine Ball Chest Throw',         'de', 'Medizinball-Brustpass')),
    ('mb_rotational_throw',    jsonb_build_object('en', 'Medicine Ball Rotational Throw',    'de', 'Medizinball-Rotationswurf')),
    ('mb_overhead_throw',      jsonb_build_object('en', 'Medicine Ball Overhead Throw',      'de', 'Medizinball-Überkopfwurf')),
    ('clap_pushups',           jsonb_build_object('en', 'Clap Push-ups',                     'de', 'Klatsch-Liegestütze'))
) AS v(slug, name)
WHERE a.slug = v.slug;
