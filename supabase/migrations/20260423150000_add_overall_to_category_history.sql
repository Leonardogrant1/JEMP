-- ─────────────────────────────────────────────────────────────
-- Allow category_id = NULL to represent the "overall" (all-
-- category average) snapshot. NULL is used as the sentinel
-- value instead of a fake category row.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE user_category_level_history
    ALTER COLUMN category_id DROP NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- Update snapshot function to also write the overall average.
-- NULL category_id = average of all categories for that user.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_take_category_level_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Per-category snapshots (unchanged)
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

    -- 2. Overall snapshot: average of all category scores per user
    INSERT INTO user_category_level_history (user_id, category_id, level_score)
    SELECT
        ucl.user_id,
        NULL AS category_id,
        ROUND(AVG(ucl.level_score))::INTEGER AS level_score
    FROM user_category_levels ucl
    GROUP BY ucl.user_id
    HAVING COUNT(*) > 0
    AND NOT EXISTS (
        SELECT 1
        FROM user_category_level_history h
        WHERE h.user_id     = ucl.user_id
          AND h.category_id IS NULL
          AND h.recorded_at::date = CURRENT_DATE
    );
END;
$$;
