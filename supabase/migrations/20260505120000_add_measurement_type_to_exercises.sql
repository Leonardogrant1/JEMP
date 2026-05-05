ALTER TABLE exercises
  ADD COLUMN measurement_type text NOT NULL DEFAULT 'reps_or_duration'
  CHECK (measurement_type IN ('reps', 'duration', 'distance', 'reps_or_duration'));
