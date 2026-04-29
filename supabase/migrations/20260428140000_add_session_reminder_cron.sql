-- ─────────────────────────────────────────────────────────────
-- Cron: send daily session reminder push notifications at 08:00 UTC.
--
-- Prerequisites (run once manually in SQL editor):
--   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://<project-ref>.supabase.co';
--   ALTER DATABASE postgres SET app.settings.service_role_key = '<service-role-key>';
-- ─────────────────────────────────────────────────────────────

SELECT cron.schedule(
    'daily-session-reminders',
    '0 8 * * *',
    $cron$
    SELECT net.http_post(
        url  := current_setting('app.settings.supabase_url') || '/functions/v1/send-session-reminders',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $cron$
);
