-- ─────────────────────────────────────────────────────────────
-- Function: snapshot current user_category_levels into history.
-- Inserts one row per user per category, skips if a snapshot
-- for today already exists (idempotent).
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_take_category_level_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_category_level_history (user_id, category_id, level_score)
    SELECT ucl.user_id, ucl.category_id, ucl.level_score
    FROM user_category_levels ucl
    WHERE NOT EXISTS (
        SELECT 1
        FROM user_category_level_history h
        WHERE h.user_id     = ucl.user_id
          AND h.category_id = ucl.category_id
          AND h.recorded_at::date = CURRENT_DATE
    );
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- Cron: run daily at 00:00 UTC
-- Pure SQL — no edge function needed.
-- ─────────────────────────────────────────────────────────────

SELECT cron.schedule(
    'daily-category-level-snapshot',
    '0 0 * * *',
    $$SELECT fn_take_category_level_snapshot()$$
);
