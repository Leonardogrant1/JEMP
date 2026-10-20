-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- 1. Re-route assessment attribution (spec §4.6): the per-category level
--    averaging joins through assessments.category_id — moving these rows
--    moves future scores into the sprint/cod pillars.
UPDATE assessments SET category_id = (SELECT id FROM categories WHERE slug = 'sprints')
WHERE slug IN ('sprint_10m', 'sprint_30m', 'sprint_10m_flying')
  AND EXISTS (SELECT 1 FROM categories WHERE slug = 'sprints');
UPDATE assessments SET category_id = (SELECT id FROM categories WHERE slug = 'cod')
WHERE slug = 'agility_505'
  AND EXISTS (SELECT 1 FROM categories WHERE slug = 'cod');

-- 2. Source tracking (spec §4.1): default self_estimate; completing a scored
--    assessment flips to measured (app mutation, phase-5 task 4).
DO $$ BEGIN
    CREATE TYPE score_source AS ENUM ('self_estimate', 'measured');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE user_category_levels
    ADD COLUMN IF NOT EXISTS source score_source NOT NULL DEFAULT 'self_estimate',
    ADD COLUMN IF NOT EXISTS measured_at TIMESTAMPTZ;

-- 3. Backfill: categories with any scored, completed assessment are measured.
UPDATE user_category_levels ucl SET source = 'measured', measured_at = sub.last_at
FROM (
    SELECT ua.user_id, a.category_id, max(ua.completed_at) AS last_at
    FROM user_assessments ua
    JOIN assessments a ON a.id = ua.assessment_id
    JOIN metric_entries me ON me.user_assessment_id = ua.id AND me.score IS NOT NULL
    WHERE ua.status = 'completed'
    GROUP BY ua.user_id, a.category_id
) sub
WHERE sub.user_id = ucl.user_id AND sub.category_id = ucl.category_id
  AND ucl.source = 'self_estimate';

-- 4. Conditioning metrics + assessments (spec §4.4): Repeated Sprint Test
--    (6×30m/25s — app computes drop-off + mean, two metric entries) and
--    Cooper 12-min run as the space-independent fallback.
INSERT INTO metrics (slug, unit, higher_is_better)
SELECT v.slug, v.unit::metric_unit, v.hib
FROM (VALUES
    ('rst_drop_off',   's',  false),  -- stored as percent; unit enum has no '%', app renders label
    ('rst_mean_time',  's',  false),
    ('cooper_distance','m',  true)
) AS v(slug, unit, hib)
WHERE NOT EXISTS (SELECT 1 FROM metrics m WHERE m.slug = v.slug);

INSERT INTO assessments (slug, name, description, measured_metric_id, min_level, max_level, category_id, name_i18n, description_i18n)
SELECT v.slug, v.name, v.description,
       (SELECT id FROM metrics WHERE slug = v.metric_slug),
       v.min_level, v.max_level,
       (SELECT id FROM categories WHERE slug = 'conditioning'),
       v.name_i18n::jsonb, v.description_i18n::jsonb
FROM (VALUES
    ('repeated_sprint_test', 'Repeated Sprint Test',
     'Run 6 × 30 m sprints with 25 seconds rest. Record all six times — the app scores your fatigue resistance from the drop-off and your average time.',
     'rst_drop_off', 1, 100,
     '{"de": "Repeated Sprint Test", "en": "Repeated Sprint Test"}',
     '{"de": "Sprinte 6 × 30 m mit 25 Sekunden Pause. Stoppe alle sechs Zeiten — die App bewertet deine Ermüdungsresistenz aus dem Abfall und deiner Durchschnittszeit. Lauf 1 zählt zusätzlich als Sprint-Messwert.", "en": "Run 6 × 30 m sprints with 25 seconds rest. Record all six times — the app scores your fatigue resistance from the drop-off and your average time. Run 1 also counts as a sprint measurement."}'),
    ('cooper_test', 'Cooper Test',
     'Run as far as you can in 12 minutes. Measure the distance with a running app or sports watch — or count laps on a 400 m track. Enter the meters.',
     'cooper_distance', 1, 100,
     '{"de": "Cooper-Test", "en": "Cooper Test"}',
     '{"de": "Lauf 12 Minuten so weit wie möglich. Miss die Distanz mit einer Lauf-App oder Sportuhr — oder zähl auf der 400-m-Bahn deine Runden (Runden × 400 m). Trag die Meter ein. Der Timer in der App zählt die 12 Minuten für dich herunter.", "en": "Run as far as you can in 12 minutes. Measure the distance with a running app or sports watch — or count your laps on a 400 m track (laps × 400 m). Enter the meters. The in-app timer counts down the 12 minutes for you."}')
) AS v(slug, name, description, metric_slug, min_level, max_level, name_i18n, description_i18n)
WHERE NOT EXISTS (SELECT 1 FROM assessments a WHERE a.slug = v.slug);
