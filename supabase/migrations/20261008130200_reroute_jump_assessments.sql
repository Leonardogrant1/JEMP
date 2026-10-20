-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Phase-5-Review Critical 1: Jump-Assessments hingen noch an der deaktivierten
-- jumps-Kategorie — lower_body_plyometrics wäre nie messbar geworden (und
-- fn_create_user_assessments hätte neuen Usern nie Jump-Assessments zugeteilt,
-- weil jumps keine sport_category_relevance-Zeilen mehr hat).
UPDATE assessments SET category_id = (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics')
WHERE slug IN ('vertical_jump', 'broad_jump', 'box_jump')
  AND EXISTS (SELECT 1 FROM categories WHERE slug = 'lower_body_plyometrics');

-- Recompute wie 20261008130100, jetzt inklusive lbp: faltet Jump-Scores in die
-- lbp-Level und repariert zugleich die sprint-kontaminierten Alt-Werte.
WITH latest AS (
    SELECT DISTINCT ON (ua.user_id, ua.assessment_id)
        ua.user_id, ua.assessment_id, a.category_id, me.score, ua.completed_at
    FROM user_assessments ua
    JOIN assessments a ON a.id = ua.assessment_id
    JOIN metric_entries me ON me.user_assessment_id = ua.id AND me.score IS NOT NULL
    WHERE ua.status = 'completed' AND a.category_id IS NOT NULL
    ORDER BY ua.user_id, ua.assessment_id, ua.completed_at DESC
), per_category AS (
    SELECT user_id, category_id,
           round(avg(score))::int AS level_score,
           max(completed_at) AS last_at
    FROM latest
    GROUP BY user_id, category_id
)
INSERT INTO user_category_levels (user_id, category_id, level_score, source, measured_at)
SELECT pc.user_id, pc.category_id, pc.level_score, 'measured', pc.last_at
FROM per_category pc
JOIN categories c ON c.id = pc.category_id
WHERE c.slug = 'lower_body_plyometrics'
ON CONFLICT (user_id, category_id) DO UPDATE
SET level_score = EXCLUDED.level_score,
    source = 'measured',
    measured_at = EXCLUDED.measured_at;
