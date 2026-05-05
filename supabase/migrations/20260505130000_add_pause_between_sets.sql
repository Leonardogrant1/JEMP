ALTER TABLE workout_plan_sessions
  ADD COLUMN pause_between_sets integer NOT NULL DEFAULT 90;

ALTER TABLE workout_sessions
  ADD COLUMN pause_between_sets integer NOT NULL DEFAULT 90;
