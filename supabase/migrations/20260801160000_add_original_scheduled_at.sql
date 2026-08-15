-- Preserves the first-planned date when a user reschedules a session.
-- Set once on the first reschedule; later reschedules keep the original value,
-- so it always answers "which slot was this session originally planned for?".
alter table public.workout_sessions
    add column original_scheduled_at timestamptz;
