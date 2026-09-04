-- AMRAP-Flag: Bodyweight-Reps-Übungen in Strength-Hauptblöcken werden mit
-- allen Sätzen bis kurz vors Muskelversagen trainiert ("as many reps as
-- possible") — ohne Zusatzlast gibt es sonst keinen Intensitätsregler.

ALTER TABLE workout_plan_session_block_exercises
    ADD COLUMN is_amrap boolean NOT NULL DEFAULT false;

ALTER TABLE workout_session_block_exercises
    ADD COLUMN is_amrap boolean NOT NULL DEFAULT false;
