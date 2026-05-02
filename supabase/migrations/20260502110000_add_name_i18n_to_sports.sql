ALTER TABLE sports ADD COLUMN IF NOT EXISTS name_i18n JSONB;

UPDATE sports AS s
SET name_i18n = v.name
FROM (VALUES
    ('boxing',        jsonb_build_object('en', 'Boxing',        'de', 'Boxen')),
    ('mma',           jsonb_build_object('en', 'MMA',           'de', 'MMA')),
    ('wrestling',     jsonb_build_object('en', 'Wrestling',     'de', 'Ringen')),
    ('judo',          jsonb_build_object('en', 'Judo',          'de', 'Judo')),
    ('bjj',           jsonb_build_object('en', 'BJJ',           'de', 'BJJ')),
    ('kickboxing',    jsonb_build_object('en', 'Kickboxing',    'de', 'Kickboxen')),
    ('karate',        jsonb_build_object('en', 'Karate',        'de', 'Karate')),
    ('taekwondo',     jsonb_build_object('en', 'Taekwondo',     'de', 'Taekwondo')),
    ('football',      jsonb_build_object('en', 'Football',      'de', 'Football')),
    ('basketball',    jsonb_build_object('en', 'Basketball',    'de', 'Basketball')),
    ('volleyball',    jsonb_build_object('en', 'Volleyball',    'de', 'Volleyball')),
    ('handball',      jsonb_build_object('en', 'Handball',      'de', 'Handball')),
    ('rugby',         jsonb_build_object('en', 'Rugby',         'de', 'Rugby')),
    ('hockey',        jsonb_build_object('en', 'Hockey',        'de', 'Hockey')),
    ('soccer',        jsonb_build_object('en', 'Soccer',        'de', 'Fußball')),
    ('sprinting',     jsonb_build_object('en', 'Sprinting',     'de', 'Sprint')),
    ('jumping',       jsonb_build_object('en', 'Jumping',       'de', 'Sprung')),
    ('throwing',      jsonb_build_object('en', 'Throwing',      'de', 'Wurf')),
    ('powerlifting',  jsonb_build_object('en', 'Powerlifting',  'de', 'Powerlifting')),
    ('weightlifting', jsonb_build_object('en', 'Weightlifting', 'de', 'Gewichtheben')),
    ('crossfit',      jsonb_build_object('en', 'CrossFit',      'de', 'CrossFit')),
    ('bodybuilding',  jsonb_build_object('en', 'Bodybuilding',  'de', 'Bodybuilding')),
    ('running',       jsonb_build_object('en', 'Running',       'de', 'Laufen')),
    ('cycling',       jsonb_build_object('en', 'Cycling',       'de', 'Radfahren')),
    ('swimming',      jsonb_build_object('en', 'Swimming',      'de', 'Schwimmen')),
    ('triathlon',     jsonb_build_object('en', 'Triathlon',     'de', 'Triathlon')),
    ('tennis',        jsonb_build_object('en', 'Tennis',        'de', 'Tennis')),
    ('badminton',     jsonb_build_object('en', 'Badminton',     'de', 'Badminton')),
    ('squash',        jsonb_build_object('en', 'Squash',        'de', 'Squash')),
    ('gymnastics',    jsonb_build_object('en', 'Gymnastics',    'de', 'Turnen')),
    ('climbing',      jsonb_build_object('en', 'Climbing',      'de', 'Klettern')),
    ('other',         jsonb_build_object('en', 'Other',         'de', 'Sonstiges'))
) AS v(slug, name)
WHERE s.slug = v.slug;
