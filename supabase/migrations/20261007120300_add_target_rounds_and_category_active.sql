-- Conditioning interval rounds (spec §1.4): work/rest already exist as
-- target_duration_seconds / target_rest_seconds; only rounds is new.
ALTER TABLE workout_plan_session_block_exercises
    ADD COLUMN target_rounds INTEGER CHECK (target_rounds IS NULL OR target_rounds > 0);

ALTER TABLE workout_session_block_exercises
    ADD COLUMN target_rounds INTEGER CHECK (target_rounds IS NULL OR target_rounds > 0);

-- Category active flag (spec §1.1): deactivated categories keep FK
-- integrity but are never assigned again. All current rows stay active;
-- the jumps merge (spec §6.1 step 4) flips this later, post-app-release.
ALTER TABLE categories
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
