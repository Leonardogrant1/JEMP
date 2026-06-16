-- ─────────────────────────────────────────────────────────────────────────────
-- Add environment per session
--
-- 1. user_profiles.day_environments (nullable JSONB)
--    Stores the user's optional per-day environment selection from onboarding.
--    Format: [{ "day_of_week": 1, "environment_id": "uuid" }, ...]
--
-- 2. workout_plan_sessions.environment_id (NOT NULL, backfilled with gym)
-- 3. workout_sessions.environment_id (NOT NULL, backfilled with gym)
-- ─────────────────────────────────────────────────────────────────────────────

-- user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS day_environments JSONB;

-- workout_plan_sessions: add nullable, backfill, set NOT NULL
ALTER TABLE workout_plan_sessions
  ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES environments(id);

UPDATE workout_plan_sessions
SET environment_id = (SELECT id FROM environments WHERE slug = 'gym')
WHERE environment_id IS NULL;

ALTER TABLE workout_plan_sessions
  ALTER COLUMN environment_id SET NOT NULL;

-- workout_sessions: add nullable, backfill, set NOT NULL
ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES environments(id);

UPDATE workout_sessions
SET environment_id = (SELECT id FROM environments WHERE slug = 'gym')
WHERE environment_id IS NULL;

ALTER TABLE workout_sessions
  ALTER COLUMN environment_id SET NOT NULL;
