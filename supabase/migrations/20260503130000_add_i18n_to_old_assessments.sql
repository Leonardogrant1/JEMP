-- ─────────────────────────────────────────────────────────────
-- Add name_i18n and description_i18n (EN + DE) to the 19
-- assessments seeded in 20260420072157_seed_assessments.sql
-- ─────────────────────────────────────────────────────────────

-- Strength: 1RM
UPDATE assessments SET
    name_i18n        = '{"en": "Back Squat 1RM", "de": "Kniebeuge 1RM"}',
    description_i18n = '{"en": "Find your 1-rep max on the back squat. Work up gradually with sufficient rest between attempts.", "de": "Ermittle dein 1-Wiederholungsmaximum in der Kniebeuge. Steigere das Gewicht schrittweise mit ausreichend Pause zwischen den Versuchen."}'
WHERE slug = 'back_squat_1rm';

UPDATE assessments SET
    name_i18n        = '{"en": "Hip Thrust 1RM", "de": "Hip Thrust 1RM"}',
    description_i18n = '{"en": "Find your 1-rep max on the barbell hip thrust.", "de": "Ermittle dein 1-Wiederholungsmaximum im Langhantel-Hip-Thrust."}'
WHERE slug = 'hip_thrust_1rm';

UPDATE assessments SET
    name_i18n        = '{"en": "Romanian Deadlift 1RM", "de": "Rumänisches Kreuzheben 1RM"}',
    description_i18n = '{"en": "Find your 1-rep max on the Romanian deadlift. Maintain neutral spine throughout.", "de": "Ermittle dein 1-Wiederholungsmaximum im rumänischen Kreuzheben. Halte die Wirbelsäule während der gesamten Bewegung neutral."}'
WHERE slug = 'romanian_deadlift_1rm';

UPDATE assessments SET
    name_i18n        = '{"en": "Bench Press 1RM", "de": "Bankdrücken 1RM"}',
    description_i18n = '{"en": "Find your 1-rep max on the flat barbell bench press.", "de": "Ermittle dein 1-Wiederholungsmaximum im flachen Langhantel-Bankdrücken."}'
WHERE slug = 'bench_press_1rm';

UPDATE assessments SET
    name_i18n        = '{"en": "Weighted Pull-up 1RM", "de": "Klimmzug mit Zusatzgewicht 1RM"}',
    description_i18n = '{"en": "Find your 1-rep max on the pull-up with added weight via belt or vest.", "de": "Ermittle dein 1-Wiederholungsmaximum beim Klimmzug mit Zusatzgewicht über Gürtel oder Weste."}'
WHERE slug = 'weighted_pullups_1rm';

-- Strength: max reps
UPDATE assessments SET
    name_i18n        = '{"en": "Max Push-ups", "de": "Max. Liegestütze"}',
    description_i18n = '{"en": "Perform as many push-ups as possible in one unbroken set. Full range of motion required.", "de": "Führe so viele Liegestütze wie möglich in einem einzigen Satz ohne Pause aus. Voller Bewegungsumfang erforderlich."}'
WHERE slug = 'max_pushups';

UPDATE assessments SET
    name_i18n        = '{"en": "Max Pull-ups", "de": "Max. Klimmzüge"}',
    description_i18n = '{"en": "Perform as many strict pull-ups as possible in one unbroken set.", "de": "Führe so viele saubere Klimmzüge wie möglich in einem einzigen Satz ohne Pause aus."}'
WHERE slug = 'max_pullups';

UPDATE assessments SET
    name_i18n        = '{"en": "Max Dips", "de": "Max. Dips"}',
    description_i18n = '{"en": "Perform as many strict dips as possible in one unbroken set.", "de": "Führe so viele saubere Dips wie möglich in einem einzigen Satz ohne Pause aus."}'
WHERE slug = 'max_dips';

-- Jumps
UPDATE assessments SET
    name_i18n        = '{"en": "Vertical Jump", "de": "Vertikalsprung"}',
    description_i18n = '{"en": "Jump as high as possible from a standing position. Measure height reached in cm.", "de": "Springe aus dem Stand so hoch wie möglich. Miss die erreichte Höhe in cm."}'
WHERE slug = 'vertical_jump';

UPDATE assessments SET
    name_i18n        = '{"en": "Broad Jump", "de": "Weitsprung aus dem Stand"}',
    description_i18n = '{"en": "Jump as far as possible horizontally from a standing position. Measure distance in cm.", "de": "Springe aus dem Stand so weit wie möglich horizontal. Miss die Weite in cm."}'
WHERE slug = 'broad_jump';

UPDATE assessments SET
    name_i18n        = '{"en": "Box Jump", "de": "Box Jump"}',
    description_i18n = '{"en": "Jump onto the highest box you can land cleanly and safely. Record box height in cm.", "de": "Springe auf die höchste Box, auf der du sauber und sicher landen kannst. Notiere die Boxhöhe in cm."}'
WHERE slug = 'box_jump';

-- Lower body plyometrics
UPDATE assessments SET
    name_i18n        = '{"en": "10m Sprint", "de": "10m Sprint"}',
    description_i18n = '{"en": "Sprint 10 meters from a standing start. Record time in seconds.", "de": "Sprintt 10 Meter aus dem Stand. Notiere die Zeit in Sekunden."}'
WHERE slug = 'sprint_10m';

UPDATE assessments SET
    name_i18n        = '{"en": "30m Sprint", "de": "30m Sprint"}',
    description_i18n = '{"en": "Sprint 30 meters from a standing start. Record time in seconds.", "de": "Sprintt 30 Meter aus dem Stand. Notiere die Zeit in Sekunden."}'
WHERE slug = 'sprint_30m';

UPDATE assessments SET
    name_i18n        = '{"en": "10m Flying Sprint", "de": "10m Fliegender Sprint"}',
    description_i18n = '{"en": "Sprint 10 meters with a rolling start. Isolates pure top-end speed.", "de": "Sprintt 10 Meter mit Anlauf. Isoliert die Maximalgeschwindigkeit."}'
WHERE slug = 'sprint_10m_flying';

UPDATE assessments SET
    name_i18n        = '{"en": "505 Agility Test", "de": "505 Agilitätstest"}',
    description_i18n = '{"en": "Sprint 5m, touch the line, turn 180° and sprint back 5m. Record total time in seconds.", "de": "Sprintt 5m, berühre die Linie, drehe 180° und sprintt 5m zurück. Notiere die Gesamtzeit in Sekunden."}'
WHERE slug = 'agility_505';

-- Upper body plyometrics
UPDATE assessments SET
    name_i18n        = '{"en": "Medicine Ball Chest Throw", "de": "Medizinball-Brustpass"}',
    description_i18n = '{"en": "Standing chest pass throw with a medicine ball. Record distance in cm.", "de": "Medizinball-Brustpass aus dem Stand. Notiere die Weite in cm."}'
WHERE slug = 'mb_chest_throw';

UPDATE assessments SET
    name_i18n        = '{"en": "Medicine Ball Rotational Throw", "de": "Medizinball-Rotationswurf"}',
    description_i18n = '{"en": "Rotational side throw against a wall or open space. Record distance in cm.", "de": "Rotationswurf zur Seite gegen eine Wand oder in den freien Raum. Notiere die Weite in cm."}'
WHERE slug = 'mb_rotational_throw';

UPDATE assessments SET
    name_i18n        = '{"en": "Medicine Ball Overhead Throw", "de": "Medizinball-Überkopfwurf"}',
    description_i18n = '{"en": "Two-hand overhead throw for distance. Record distance in cm.", "de": "Beidhändiger Überkopfwurf für Weite. Notiere die Weite in cm."}'
WHERE slug = 'mb_overhead_throw';

UPDATE assessments SET
    name_i18n        = '{"en": "Clap Push-ups", "de": "Klatsch-Liegestütze"}',
    description_i18n = '{"en": "Perform as many clap push-ups as possible. Full extension required at top.", "de": "Führe so viele Klatsch-Liegestütze wie möglich aus. Volle Streckung oben erforderlich."}'
WHERE slug = 'clap_pushups';
