UPDATE categories AS c
SET
    name_i18n        = v.name,
    description_i18n = v.description
FROM (VALUES
    ('strength',
        jsonb_build_object('en', 'Strength',                 'de', 'Kraft'),
        jsonb_build_object('en', 'Maximum strength, muscle growth and functional strength.', 'de', 'Maximalkraft, Muskelaufbau und funktionelle Stärke.')),
    ('jumps',
        jsonb_build_object('en', 'Jumps',                    'de', 'Sprünge'),
        jsonb_build_object('en', 'Jump strength, explosiveness and vertical performance.',   'de', 'Sprungkraft, Explosivität und vertikale Leistung.')),
    ('lower_body_plyometrics',
        jsonb_build_object('en', 'Lower Body Plyometrics',   'de', 'Unterkörper Plyometrie'),
        jsonb_build_object('en', 'Reactive strength and speed in the lower body — e.g. for sprints.', 'de', 'Reaktivkraft und Schnelligkeit im Unterkörper — z.B. für Sprints.')),
    ('upper_body_plyometrics',
        jsonb_build_object('en', 'Upper Body Plyometrics',   'de', 'Oberkörper Plyometrie'),
        jsonb_build_object('en', 'Explosive upper body power — e.g. for striking, throwing.', 'de', 'Explosive Kraft im Oberkörper — z.B. für Schlagbewegungen, Würfe.')),
    ('mobility',
        jsonb_build_object('en', 'Mobility',                 'de', 'Mobilität'),
        jsonb_build_object('en', 'Flexibility, joint stability and body control.',           'de', 'Beweglichkeit, Gelenkstabilität und Körperkontrolle.'))
) AS v(slug, name, description)
WHERE c.slug = v.slug;
