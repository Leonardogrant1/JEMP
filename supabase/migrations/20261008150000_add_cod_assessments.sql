-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Zwei zusätzliche COD-Assessments (User-Entscheid 08.10., QA-Runde):
-- 5-10-5 als lateral-lastiger Teamsport-Standard, Hexagon als anlaufstrecken-
-- freier Test für Kämpfer (COD seit 20261008140000 für Striker sichtbar).
INSERT INTO metrics (slug, unit, higher_is_better)
SELECT v.slug, v.unit::metric_unit, v.hib
FROM (VALUES
    ('pro_agility_time', 's', false),
    ('hexagon_time',     's', false)
) AS v(slug, unit, hib)
WHERE NOT EXISTS (SELECT 1 FROM metrics m WHERE m.slug = v.slug);

INSERT INTO assessments (slug, name, description, measured_metric_id, min_level, max_level, category_id, name_i18n, description_i18n)
SELECT v.slug, v.name, v.description,
       (SELECT id FROM metrics WHERE slug = v.metric_slug),
       v.min_level, v.max_level,
       (SELECT id FROM categories WHERE slug = 'cod'),
       v.name_i18n::jsonb, v.description_i18n::jsonb
FROM (VALUES
    ('pro_agility_shuttle_test', '5-10-5 Pro Agility',
     'Start at the middle cone, sprint 5 m right, 10 m left, 5 m back to the middle. Record the time in seconds.',
     'pro_agility_time', 1, 100,
     '{"de": "5-10-5 Pro Agility", "en": "5-10-5 Pro Agility"}',
     '{"de": "Starte am mittleren Hütchen, sprinte 5 m nach rechts, 10 m nach links und 5 m zurück zur Mitte. Stoppe die Zeit in Sekunden. Der NFL-Combine-Klassiker für laterale Richtungswechsel.", "en": "Start at the middle cone, sprint 5 m right, 10 m left and 5 m back to the middle. Record the time in seconds. The NFL combine classic for lateral change of direction."}'),
    ('hexagon_test', 'Hexagon Test',
     'Hop over the six sides of a hexagon (60 cm sides) and back to the middle, three full revolutions. Record the total time in seconds.',
     'hexagon_time', 1, 100,
     '{"de": "Hexagon-Test", "en": "Hexagon Test"}',
     '{"de": "Spring beidbeinig über die sechs Seiten eines Sechsecks (60 cm Kantenlänge, mit Tape geklebt) und zurück zur Mitte — drei volle Runden. Stoppe die Gesamtzeit. Braucht nur einen Quadratmeter — ideal ohne Laufstrecke.", "en": "Hop with both feet over the six sides of a hexagon (60 cm sides, taped on the floor) and back to the middle — three full revolutions. Record the total time. Needs just one square meter — ideal without a runway."}')
) AS v(slug, name, description, metric_slug, min_level, max_level, name_i18n, description_i18n)
WHERE NOT EXISTS (SELECT 1 FROM assessments a WHERE a.slug = v.slug);
