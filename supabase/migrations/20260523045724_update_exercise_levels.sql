-- Update max_level to 100 for all exercises that are not true beginner progressions.
-- Only these 7 slugs keep their original max_level because they are genuine learning crutches
-- that get replaced by harder variants as athletes advance.

UPDATE exercises
SET max_level = 100
WHERE max_level < 100
  AND slug NOT IN (
    'negative_pull_up',
    'assisted_pistol_squat',
    'wall_drill_march',
    'butt_kicks',
    'banded_hip_flexor_march',
    'agility_ladder_ickey_shuffle',
    'wall_supported_hamstring_curl'
  );
