-- Consolidates the 7 overly specific image groups added in 20260601120000
-- back into existing groups. mobility_development stays as its own group.
-- Note: PostgreSQL does not support dropping enum values, so the old values
-- remain in the type but will no longer be used by any row.

UPDATE exercises SET image_group = 'squat_patterns'   WHERE image_group = 'lunges';
UPDATE exercises SET image_group = 'hip_thrust'        WHERE image_group = 'glute_hip_activation';
UPDATE exercises SET image_group = 'hip_hinge'         WHERE image_group = 'posterior_chain_iso';
UPDATE exercises SET image_group = 'mobility'          WHERE image_group = 'calf_ankle';
UPDATE exercises SET image_group = 'conditioning'      WHERE image_group = 'core';
UPDATE exercises SET image_group = 'hip_thrust'        WHERE image_group = 'adductor';
UPDATE exercises SET image_group = 'sprints'           WHERE image_group = 'sprint_drills';
