-- ─────────────────────────────────────────────────────────────
-- DEV ONLY: seed category level history with backdated rows.
-- Generates one row per category per day for the past p_days days,
-- starting from current user_category_levels with small random variance.
-- Safe to call multiple times (skips existing date+category combos).
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_dev_seed_category_history(p_user_id uuid, p_days integer DEFAULT 10)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_day integer;
BEGIN
    FOR v_day IN 1..p_days LOOP
        -- Per-category rows
        INSERT INTO user_category_level_history (user_id, category_id, level_score, recorded_at)
        SELECT
            ucl.user_id,
            ucl.category_id,
            GREATEST(1, LEAST(100,
                ucl.level_score
                - (p_days - v_day)                          -- linear base trend (lower in the past)
                + floor(random() * 5 - 2)::integer          -- ±2 noise
            )),
            (NOW() - ((p_days - v_day) || ' days')::interval)
        FROM user_category_levels ucl
        WHERE ucl.user_id = p_user_id
          AND NOT EXISTS (
              SELECT 1 FROM user_category_level_history h
              WHERE h.user_id     = ucl.user_id
                AND h.category_id = ucl.category_id
                AND h.recorded_at::date = (NOW() - ((p_days - v_day) || ' days')::interval)::date
          );

        -- Overall row (NULL category_id)
        INSERT INTO user_category_level_history (user_id, category_id, level_score, recorded_at)
        SELECT
            p_user_id,
            NULL,
            GREATEST(1, LEAST(100,
                ROUND(AVG(ucl.level_score))::integer
                - (p_days - v_day)
                + floor(random() * 5 - 2)::integer
            )),
            (NOW() - ((p_days - v_day) || ' days')::interval)
        FROM user_category_levels ucl
        WHERE ucl.user_id = p_user_id
        HAVING COUNT(*) > 0
        AND NOT EXISTS (
            SELECT 1 FROM user_category_level_history h
            WHERE h.user_id     = p_user_id
              AND h.category_id IS NULL
              AND h.recorded_at::date = (NOW() - ((p_days - v_day) || ' days')::interval)::date
        );
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_dev_seed_category_history(uuid, integer) TO authenticated;
