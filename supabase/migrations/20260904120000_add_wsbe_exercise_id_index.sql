-- Prod-Incident 01.09.: usePreviousExerciseSetsQuery (Progression-Historie)
-- filtert workout_session_block_exercises nach exercise_id — ohne Index heißt
-- das Sequential Scan über 1,2 Mio. Zeilen und Statement-Timeouts (2× 500er
-- in den Logs, User konnte die Session gefühlt nicht beenden).

CREATE INDEX IF NOT EXISTS workout_session_block_exercises_exercise_id_idx
    ON workout_session_block_exercises (exercise_id);
