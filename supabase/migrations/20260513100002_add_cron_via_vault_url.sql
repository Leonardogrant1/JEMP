-- Create private schema for internal helper functions
CREATE SCHEMA IF NOT EXISTS private;

-- Helper: read project URL from Supabase Vault
-- Requires a secret named 'project_url' to be set in the Vault.
CREATE OR REPLACE FUNCTION private.project_url()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url';
$$;

-- Cron: send session reminder push notifications daily at 08:00 UTC
SELECT cron.schedule(
  'daily-session-reminders',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url     := private.project_url() || '/functions/v1/send-session-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- Cron: renew user assessments every Monday at 06:00 UTC
SELECT cron.schedule(
  'renew-user-assessments',
  '0 6 * * 1',
  $$
  SELECT net.http_post(
    url     := private.project_url() || '/functions/v1/create-user-assessments',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
