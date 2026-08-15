-- Account deletion hangs because the ON DELETE CASCADE / SET NULL chain from
-- user_profiles down to workout_session_block_exercises has no indexes on the
-- referencing FK columns. Postgres then runs one sequential scan over the
-- referencing table PER DELETED ROW (850k+ rows in prod), which exceeds the
-- request timeout ("canceling statement due to user request" in pg logs).
--
-- Production note: apply these there as CREATE INDEX CONCURRENTLY via the SQL
-- editor to avoid locking the tables (CONCURRENTLY cannot run inside the
-- migration transaction).

-- workout_plan_* chain (cascade from workout_plans on profile delete)
CREATE INDEX IF NOT EXISTS workout_plan_session_blocks_workout_plan_session_id_idx
  ON workout_plan_session_blocks (workout_plan_session_id);

CREATE INDEX IF NOT EXISTS workout_plan_session_block_exercises_block_id_idx
  ON workout_plan_session_block_exercises (workout_plan_session_block_id);

-- workout_session_* chain (cascade from workout_sessions, SET NULL from plan side)
CREATE INDEX IF NOT EXISTS workout_session_blocks_workout_session_id_idx
  ON workout_session_blocks (workout_session_id);

CREATE INDEX IF NOT EXISTS workout_session_blocks_plan_block_id_idx
  ON workout_session_blocks (workout_plan_session_block_id);

CREATE INDEX IF NOT EXISTS workout_session_block_exercises_plan_block_id_idx
  ON workout_session_block_exercises (workout_plan_session_block_id);

CREATE INDEX IF NOT EXISTS workout_session_block_exercises_plan_block_exercise_id_idx
  ON workout_session_block_exercises (workout_plan_session_block_exercise_id);
