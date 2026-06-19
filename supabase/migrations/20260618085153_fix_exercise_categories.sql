-- ─────────────────────────────────────────────────────────────
-- Fix exercise categories and introduce sport-group gating.
--
-- 1. is_sport_specific: marks exercises that are sport skills, not
--    athletic qualities. These belong only in warmup and only surface
--    for athletes in the matching sport group.
--
-- 2. exercise_sport_groups: one-to-many gate linking is_sport_specific
--    exercises to sports.group_name values. An exercise can cover
--    multiple sport groups.
--
-- 3. Category corrections: several exercises were seeded into the wrong
--    category. Fixed here with UPDATE statements.
--
-- 4. shadow_boxing block cleanup: remove from primary/secondary blocks
--    since it is a sport skill, not a trainable athletic category.
-- ─────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Mark sport-specific exercises ─────────────────────────
ALTER TABLE exercises
    ADD COLUMN IF NOT EXISTS is_sport_specific BOOLEAN NOT NULL DEFAULT false;

-- ── 2. Sport-group gate (one exercise → many sport groups) ───
CREATE TABLE IF NOT EXISTS exercise_sport_groups (
    exercise_id  UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    sport_group  TEXT NOT NULL CHECK (sport_group IN (
        'combat_sports',
        'team_sports',
        'athletics',
        'strength',
        'endurance',
        'racket_sports',
        'other'
    )),
    PRIMARY KEY (exercise_id, sport_group)
);

ALTER TABLE exercise_sport_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view exercise_sport_groups"
    ON exercise_sport_groups FOR SELECT TO authenticated USING (true);

-- ── 3. Category corrections ───────────────────────────────────

-- shadow_boxing was seeded as lower_body_plyometrics — clearly wrong.
-- It is a combat sport skill, upper-body in nature.
UPDATE exercises
    SET category_id = (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics')
    WHERE slug = 'shadow_boxing';

-- band_pull_apart and scapular_pull_up are upper-body plyo/reactive
-- exercises, not general strength.
UPDATE exercises
    SET category_id = (SELECT id FROM categories WHERE slug = 'upper_body_plyometrics')
    WHERE slug IN ('band_pull_apart', 'scapular_pull_up');

-- dumbbell_swing was seeded as lower_body_plyometrics but is a
-- posterior chain strength/power exercise.
UPDATE exercises
    SET category_id = (SELECT id FROM categories WHERE slug = 'strength')
    WHERE slug = 'dumbbell_swing';

-- mountain_climber was seeded as strength but is a conditioning/
-- locomotion exercise closer to lower_body_plyometrics.
-- leg_swing_front_to_back and leg_swing_side_to_side were seeded as
-- mobility but are dynamic lower-body movements for sprint/plyo prep.
UPDATE exercises
    SET category_id = (SELECT id FROM categories WHERE slug = 'lower_body_plyometrics')
    WHERE slug IN ('mountain_climber', 'leg_swing_front_to_back', 'leg_swing_side_to_side');

-- ── 4. shadow_boxing: sport-specific, warmup-only, combat_sports ──
UPDATE exercises SET is_sport_specific = true WHERE slug = 'shadow_boxing';

-- Ensure warmup block tag exists
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT e.id, bt.id
FROM exercises e, block_types bt
WHERE e.slug = 'shadow_boxing' AND bt.slug = 'warmup'
ON CONFLICT DO NOTHING;

-- Remove from all non-warmup blocks (primary, secondary, accessory, cooldown)
DELETE FROM exercise_blocks eb
USING exercises e, block_types bt
WHERE eb.exercise_id = e.id
  AND eb.block_type_id = bt.id
  AND e.slug = 'shadow_boxing'
  AND bt.slug <> 'warmup';

-- Gate to combat sports only
INSERT INTO exercise_sport_groups (exercise_id, sport_group)
SELECT id, 'combat_sports' FROM exercises WHERE slug = 'shadow_boxing'
ON CONFLICT DO NOTHING;

-- ── 5. Sanity check (uncomment to verify after applying) ──────
-- Sport-specific exercises in a main block (should return 0 rows):
-- SELECT e.slug, bt.slug
-- FROM exercises e
-- JOIN exercise_blocks eb ON eb.exercise_id = e.id
-- JOIN block_types bt ON bt.id = eb.block_type_id
-- WHERE e.is_sport_specific = true
--   AND bt.slug IN ('primary', 'secondary', 'accessory');

COMMIT;
