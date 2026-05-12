-- Add intensity_score and exercise_type columns to exercises
-- These replace the exercise_session_modes many-to-many mapping table

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS intensity_score integer 
    CHECK (intensity_score BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS exercise_type text 
    CHECK (exercise_type IN ('dynamic', 'restorative', 'breathing'));

DROP TABLE IF EXISTS exercise_session_modes;