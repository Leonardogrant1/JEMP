ALTER TABLE workout_plan_sessions
  ADD COLUMN IF NOT EXISTS mode_slug TEXT CHECK (mode_slug IN ('full', 'reduced', 'activation', 'recovery')),
  ADD COLUMN IF NOT EXISTS pause_between_sets INTEGER;
