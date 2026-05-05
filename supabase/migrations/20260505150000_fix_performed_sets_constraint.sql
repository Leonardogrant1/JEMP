-- Fix unique constraint on workout_session_performed_sets to include side.
-- The previous migration used invalid syntax (ADD CONSTRAINT IF NOT EXISTS).
-- This migration is idempotent: drops both possible old constraint names
-- and the new one before re-adding it cleanly.

ALTER TABLE workout_session_performed_sets
  ADD COLUMN IF NOT EXISTS side text NOT NULL DEFAULT 'bilateral'
  CHECK (side IN ('bilateral', 'left', 'right'));

-- Drop old constraint (Postgres truncates the auto-generated name to 63 chars)
ALTER TABLE workout_session_performed_sets
  DROP CONSTRAINT IF EXISTS workout_session_performed_set_workout_session_block_exercis_key;

ALTER TABLE workout_session_performed_sets
  DROP CONSTRAINT IF EXISTS workout_session_performed_sets_workout_session_block_exercise_id_set_number_key;

-- Drop new constraint in case it was already added
ALTER TABLE workout_session_performed_sets
  DROP CONSTRAINT IF EXISTS workout_session_performed_sets_block_exercise_set_side_key;

-- Add correct constraint (no IF NOT EXISTS — not valid PostgreSQL syntax)
ALTER TABLE workout_session_performed_sets
  ADD CONSTRAINT workout_session_performed_sets_block_exercise_set_side_key
  UNIQUE (workout_session_block_exercise_id, set_number, side);
