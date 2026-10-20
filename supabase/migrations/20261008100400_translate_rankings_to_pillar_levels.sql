-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Lossy approximation of the old focus ranking (spec §6.1 step 4 / §6.5):
-- pre-fills the new wizard; set_by_wizard stays false so the v2 generator
-- gate (shouldUseV2) is NEVER activated by translated rows.
INSERT INTO user_pillar_levels (user_id, category_id, level, set_by_wizard)
SELECT utc.user_id, utc.category_id,
  CASE WHEN utc.priority = 1 THEN 3 WHEN utc.priority = 2 THEN 2 ELSE 1 END,
  false
FROM user_targeted_categories utc
JOIN categories c ON c.id = utc.category_id AND c.is_active
ON CONFLICT (user_id, category_id) DO NOTHING;
