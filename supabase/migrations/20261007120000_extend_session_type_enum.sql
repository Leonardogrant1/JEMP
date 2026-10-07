-- Extend the existing session_type enum (training | recovery) with the
-- new session types from the session structure redesign. 'training'
-- continues to mean a regular workout session. Additive only: no rows
-- are written with the new values in this migration (Postgres forbids
-- using a value added in the same transaction).
ALTER TYPE session_type ADD VALUE IF NOT EXISTS 'speed';
ALTER TYPE session_type ADD VALUE IF NOT EXISTS 'mobility';
ALTER TYPE session_type ADD VALUE IF NOT EXISTS 'conditioning';
