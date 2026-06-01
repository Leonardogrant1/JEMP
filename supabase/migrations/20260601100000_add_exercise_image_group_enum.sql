CREATE TYPE exercise_image_group AS ENUM (
    'squat_patterns',
    'hip_hinge',
    'hip_thrust',
    'upper_push',
    'upper_pull',
    'olympic_lifts',
    'dumbbell_complex',
    'loaded_carry',
    'vertical_jumps',
    'horizontal_jumps',
    'hurdle_hops',
    'reactive_jumps',
    'sprints',
    'sled_exercises',
    'agility',
    'conditioning',
    'medicine_ball',
    'explosive_push',
    'mobility'
);

ALTER TABLE exercises ADD COLUMN image_group exercise_image_group;
