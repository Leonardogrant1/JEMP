-- Remove old pg_cron job for assessment renewal.
-- The schedule is now managed via config.toml (functions.create-user-assessments.schedule).
SELECT cron.unschedule('renew-user-assessments');
