-- Adds 8 new image group values to the exercise_image_group enum.
-- Pairs with 20260601130000_seed_exercise_image_groups_missing.sql.

ALTER TYPE exercise_image_group ADD VALUE IF NOT EXISTS 'lunges';
ALTER TYPE exercise_image_group ADD VALUE IF NOT EXISTS 'glute_hip_activation';
ALTER TYPE exercise_image_group ADD VALUE IF NOT EXISTS 'posterior_chain_iso';
ALTER TYPE exercise_image_group ADD VALUE IF NOT EXISTS 'calf_ankle';
ALTER TYPE exercise_image_group ADD VALUE IF NOT EXISTS 'core';
ALTER TYPE exercise_image_group ADD VALUE IF NOT EXISTS 'adductor';
ALTER TYPE exercise_image_group ADD VALUE IF NOT EXISTS 'sprint_drills';
ALTER TYPE exercise_image_group ADD VALUE IF NOT EXISTS 'mobility_development';
