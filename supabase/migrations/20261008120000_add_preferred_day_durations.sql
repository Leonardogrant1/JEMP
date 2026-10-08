-- Per-day session-duration overrides (spec §3.1): [{"day_of_week":1,"minutes":45}, ...].
-- Global preferred_session_duration stays the default; overrides win per day.
SET LOCAL lock_timeout = '5s';
ALTER TABLE user_profiles ADD COLUMN preferred_day_durations JSONB;
