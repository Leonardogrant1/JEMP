-- Prod-DDL safety (spec §6.1): fail fast instead of queueing behind a lock.
SET LOCAL lock_timeout = '5s';

-- §2.9 audit contract: breadth-lever drops are persisted per planned session
-- (array of {block_type, reason}) — validation compares expected-minus-dropped.
ALTER TABLE workout_plan_sessions
    ADD COLUMN dropped_blocks JSONB;

-- §3.1 sprint context (written by the Phase-3 wizard, read by the v2 generator).
CREATE TYPE sprint_distance_answer AS ENUM ('under_20m', '20_40m', 'over_40m');

ALTER TABLE user_profiles
    ADD COLUMN sprints_covered_by_club BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN sprint_distance sprint_distance_answer;
