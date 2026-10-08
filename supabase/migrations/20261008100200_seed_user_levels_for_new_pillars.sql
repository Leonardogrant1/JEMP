-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Without these rows the level filter excludes every recategorized exercise
-- (phase-2b review forward risk): seed new-pillar levels from the user's
-- lower_body_plyometrics level (the exercises' previous home).
INSERT INTO user_category_levels (user_id, category_id, level_score)
SELECT ucl.user_id, c_new.id, ucl.level_score
FROM user_category_levels ucl
JOIN categories c_old ON c_old.id = ucl.category_id AND c_old.slug = 'lower_body_plyometrics'
JOIN categories c_new ON c_new.slug IN ('sprints','cod','conditioning')
WHERE NOT EXISTS (
  SELECT 1 FROM user_category_levels x
  WHERE x.user_id = ucl.user_id AND x.category_id = c_new.id
);
