-- Remove old pg_cron job for session reminders.
-- The schedule is now managed via config.toml (functions.send-session-reminders.schedule).
SELECT cron.unschedule('daily-session-reminders');
