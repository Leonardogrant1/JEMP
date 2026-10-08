-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Recompute pillar levels after the assessment re-route (spec §4.6): sprint/505
-- scores leave the lower_body_plyometrics average and form sprints/cod levels.
-- Level = avg of each user's LATEST score per assessment, grouped by the NEW
-- assessments.category_id. Idempotent: pure recompute from metric_entries.
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
WHERE c.slug IN ('lower_body_plyometrics', 'sprints', 'cod')
ON CONFLICT (user_id, category_id) DO UPDATE
SET level_score = EXCLUDED.level_score,
    source = 'measured',
    measured_at = EXCLUDED.measured_at;
