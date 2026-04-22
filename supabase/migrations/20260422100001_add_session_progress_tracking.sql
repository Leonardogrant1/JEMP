-- Track user progress within an active session so they can resume after leaving

ALTER TABLE workout_sessions
    ADD COLUMN current_exercise_index INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN current_set_number INTEGER NOT NULL DEFAULT 1;
