-- ─────────────────────────────────────────────────────────────
-- fn_take_user_category_level_snapshot wrote today's history row
-- only if none existed yet. Since the nightly cron already writes
-- one, assessments completed during the day never showed up in the
-- chart until the next day. Now the function updates today's row
-- instead of skipping it (insert only when the day has no row yet).
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_take_user_category_level_snapshot(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1a. Per-category: refresh today's row if it exists
    UPDATE user_category_level_history h
    SET level_score = ucl.level_score
    FROM user_category_levels ucl
    WHERE ucl.user_id     = p_user_id
      AND h.user_id       = ucl.user_id
      AND h.category_id   = ucl.category_id
      AND h.recorded_at::date = CURRENT_DATE
      AND h.level_score IS DISTINCT FROM ucl.level_score;

    -- 1b. Per-category: insert for categories without a row today
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

    -- 2a. Overall (NULL category_id): refresh today's row if it exists
    UPDATE user_category_level_history h
    SET level_score = agg.avg_score
    FROM (
        SELECT ROUND(AVG(ucl.level_score))::INTEGER AS avg_score
        FROM user_category_levels ucl
        WHERE ucl.user_id = p_user_id
    ) agg
    WHERE h.user_id     = p_user_id
      AND h.category_id IS NULL
      AND h.recorded_at::date = CURRENT_DATE
      AND agg.avg_score IS NOT NULL
      AND h.level_score IS DISTINCT FROM agg.avg_score;

    -- 2b. Overall: insert when the day has no row yet
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
