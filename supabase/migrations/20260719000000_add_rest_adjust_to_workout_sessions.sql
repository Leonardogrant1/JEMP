-- Per-session rest time adjustment (Tagesform / user preference).
-- NULL = no override, value in seconds is added on top of the exercise's
-- target_rest_seconds (or the session's pause_between_sets fallback).
alter table public.workout_sessions
    add column rest_adjust_seconds integer;
