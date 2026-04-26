-- ─────────────────────────────────────────────────────────────
-- Function: auto-skip sessions that were missed.
--
-- Rules:
--   • sessions with status NOT IN ('completed', 'skipped', 'cancelled')
--     whose scheduled_at date < today → mark as 'skipped'
--   • exception: 'in_progress' sessions are only skipped if
--     started_at is older than 3 hours (user may still be mid-session)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_auto_skip_missed_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE workout_sessions
    SET
        status     = 'skipped',
        updated_at = NOW()
    WHERE
        DATE(scheduled_at) < CURRENT_DATE
        AND status NOT IN ('completed', 'skipped', 'cancelled')
        AND (
            status <> 'in_progress'
            OR started_at < NOW() - INTERVAL '6 hours'
        );
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- Cron: run hourly so missed sessions are marked promptly.
-- Pure SQL — no edge function needed.
-- ─────────────────────────────────────────────────────────────

SELECT cron.schedule(
    'hourly-auto-skip-missed-sessions',
    '0 * * * *',
    $$SELECT fn_auto_skip_missed_sessions()$$
);
