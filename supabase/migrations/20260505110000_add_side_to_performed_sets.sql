-- Add side column to track unilateral exercise sides
ALTER TABLE workout_session_performed_sets
  ADD COLUMN IF NOT EXISTS side text NOT NULL DEFAULT 'bilateral'
  CHECK (side IN ('bilateral', 'left', 'right'));

-- Drop old constraints (Postgres truncates auto-generated names to 63 chars,
-- so we try both the truncated and the full-length name)
ALTER TABLE workout_session_performed_sets
  DROP CONSTRAINT IF EXISTS workout_session_performed_set_workout_session_block_exercis_key;

ALTER TABLE workout_session_performed_sets
  DROP CONSTRAINT IF EXISTS "workout_session_performed_sets_workout_session_block_exercise_i";

-- Drop new constraint in case a previous failed run partially applied it
ALTER TABLE workout_session_performed_sets
  DROP CONSTRAINT IF EXISTS workout_session_performed_sets_block_exercise_set_side_key;

-- ADD CONSTRAINT IF NOT EXISTS is not valid PostgreSQL syntax.
-- We drop first (above), so this ADD always succeeds.
ALTER TABLE workout_session_performed_sets
  ADD CONSTRAINT workout_session_performed_sets_block_exercise_set_side_key
  UNIQUE (workout_session_block_exercise_id, set_number, side);
