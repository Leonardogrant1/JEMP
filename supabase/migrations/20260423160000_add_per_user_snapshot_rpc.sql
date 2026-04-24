-- ─────────────────────────────────────────────────────────────
-- Per-user snapshot function. Called after assessment completion
-- so charts update immediately without waiting for the nightly cron.
-- Idempotent: skips rows that already exist for today.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_take_user_category_level_snapshot(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Per-category snapshot for this user
    INSERT INTO user_category_level_history (user_id, category_id, level_score)
    SELECT ucl.user_id, ucl.category_id, ucl.level_score
    FROM user_category_levels ucl
    WHERE ucl.user_id = p_user_id
      AND NOT EXISTS (
          SELECT 1
          FROM user_category_level_history h
          WHERE h.user_id     = ucl.user_id
            AND h.category_id = ucl.category_id
            AND h.recorded_at::date = CURRENT_DATE
      );

    -- 2. Overall snapshot (NULL category_id = average of all categories)
    INSERT INTO user_category_level_history (user_id, category_id, level_score)
    SELECT
        p_user_id,
        NULL,
        ROUND(AVG(ucl.level_score))::INTEGER
    FROM user_category_levels ucl
    WHERE ucl.user_id = p_user_id
    HAVING COUNT(*) > 0
    AND NOT EXISTS (
        SELECT 1
        FROM user_category_level_history h
        WHERE h.user_id     = p_user_id
          AND h.category_id IS NULL
          AND h.recorded_at::date = CURRENT_DATE
    );
END;
$$;
