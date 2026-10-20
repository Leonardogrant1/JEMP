-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- New pillar categories (spec §1.1). categories.slug has no UNIQUE constraint,
-- so guard with NOT EXISTS instead of ON CONFLICT.
INSERT INTO categories (slug)
SELECT s FROM unnest(ARRAY['sprints','cod','conditioning']) AS s
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.slug = s);

-- ── jumps → lower_body_plyometrics merge ──────────────────────────────────
DO $$
DECLARE
  jumps_id uuid;
  lbp_id uuid;
BEGIN
  SELECT id INTO jumps_id FROM categories WHERE slug = 'jumps';
  SELECT id INTO lbp_id   FROM categories WHERE slug = 'lower_body_plyometrics';
  IF jumps_id IS NULL OR lbp_id IS NULL THEN
    RAISE NOTICE 'jumps merge: category missing, skipped';
    RETURN;
  END IF;

  -- Exercises move wholesale.
  UPDATE exercises SET category_id = lbp_id WHERE category_id = jumps_id;

  -- user_category_levels: keep the max level where both rows exist.
  UPDATE user_category_levels lbp SET level_score = GREATEST(lbp.level_score, j.level_score)
  FROM user_category_levels j
  WHERE j.category_id = jumps_id AND lbp.category_id = lbp_id AND lbp.user_id = j.user_id;
  DELETE FROM user_category_levels j USING user_category_levels lbp
  WHERE j.category_id = jumps_id AND lbp.category_id = lbp_id AND lbp.user_id = j.user_id;
  UPDATE user_category_levels SET category_id = lbp_id WHERE category_id = jumps_id;

  -- user_targeted_categories: keep the better (lower) priority.
  UPDATE user_targeted_categories lbp SET priority = LEAST(lbp.priority, j.priority)
  FROM user_targeted_categories j
  WHERE j.category_id = jumps_id AND lbp.category_id = lbp_id AND lbp.user_id = j.user_id;
  DELETE FROM user_targeted_categories j USING user_targeted_categories lbp
  WHERE j.category_id = jumps_id AND lbp.category_id = lbp_id AND lbp.user_id = j.user_id;
  UPDATE user_targeted_categories SET category_id = lbp_id WHERE category_id = jumps_id;

  -- workout_plan_targeted_categories: same pattern (keep existing lbp row).
  DELETE FROM workout_plan_targeted_categories j USING workout_plan_targeted_categories lbp
  WHERE j.category_id = jumps_id AND lbp.category_id = lbp_id
    AND j.workout_plan_id = lbp.workout_plan_id;
  UPDATE workout_plan_targeted_categories SET category_id = lbp_id WHERE category_id = jumps_id;

  -- sport_category_relevance: keep the max relevance (UNIQUE(sport_id, category_id) exists).
  UPDATE sport_category_relevance lbp SET relevance = GREATEST(lbp.relevance, j.relevance)
  FROM sport_category_relevance j
  WHERE j.category_id = jumps_id AND lbp.category_id = lbp_id AND lbp.sport_id = j.sport_id;
  DELETE FROM sport_category_relevance WHERE category_id = jumps_id;

  -- Deactivate, never delete (spec §1.1).
  UPDATE categories SET is_active = false WHERE id = jumps_id;
END $$;
