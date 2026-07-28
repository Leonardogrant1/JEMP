-- ─────────────────────────────────────────────────────────────
-- Creator tools for affiliate/admin roles:
-- 1) fn_assert_creator_role(): shared role guard.
-- 2) fn_refill_user_assessments(): user-scoped assessment refill
--    WITHOUT the 28-day cooldown (content creators need instant
--    refills). Insert logic mirrors fn_create_user_assessments.
-- 3) Harden fn_dev_seed_category_history: acts on auth.uid() only
--    (was callable by any authenticated user with an arbitrary
--    p_user_id) and requires the creator role.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_assert_creator_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
          AND role IN ('affiliate', 'admin')
    ) THEN
        RAISE EXCEPTION 'creator tools require affiliate or admin role';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION fn_assert_creator_role() FROM PUBLIC;

CREATE OR REPLACE FUNCTION fn_refill_user_assessments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM fn_assert_creator_role();

    INSERT INTO user_assessments (user_id, assessment_id, status)
    SELECT auth.uid(), a.id, 'pending'
    FROM assessments a
    JOIN sport_category_relevance scr
        ON scr.category_id = a.category_id
    JOIN user_profiles up
        ON up.sport_id = scr.sport_id
        AND up.id = auth.uid()
    WHERE
      -- User has all required equipment (or assessment needs none)
      NOT EXISTS (
          SELECT 1 FROM assessment_equipments ae
          WHERE ae.assessment_id = a.id
            AND NOT EXISTS (
                SELECT 1 FROM user_equipments ue
                WHERE ue.user_id = auth.uid()
                  AND ue.equipment_id = ae.equipment_id
            )
      )
      -- Not already pending or in progress (no cooldown check on purpose)
      AND NOT EXISTS (
          SELECT 1 FROM user_assessments ua
          WHERE ua.user_id = auth.uid()
            AND ua.assessment_id = a.id
            AND ua.status IN ('pending', 'in_progress')
      );
END;
$$;

REVOKE ALL ON FUNCTION fn_refill_user_assessments() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_refill_user_assessments() TO authenticated;

-- Replace the open (p_user_id, p_days) signature with a hardened one.
DROP FUNCTION IF EXISTS fn_dev_seed_category_history(uuid, integer);

CREATE FUNCTION fn_dev_seed_category_history(p_days integer DEFAULT 10)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_day integer;
    v_user_id uuid := auth.uid();
BEGIN
    PERFORM fn_assert_creator_role();

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
        WHERE ucl.user_id = v_user_id
          AND NOT EXISTS (
              SELECT 1 FROM user_category_level_history h
              WHERE h.user_id     = ucl.user_id
                AND h.category_id = ucl.category_id
                AND h.recorded_at::date = (NOW() - ((p_days - v_day) || ' days')::interval)::date
          );

        -- Overall row (NULL category_id)
        INSERT INTO user_category_level_history (user_id, category_id, level_score, recorded_at)
        SELECT
            v_user_id,
            NULL,
            GREATEST(1, LEAST(100,
                ROUND(AVG(ucl.level_score))::integer
                - (p_days - v_day)
                + floor(random() * 5 - 2)::integer
            )),
            (NOW() - ((p_days - v_day) || ' days')::interval)
        FROM user_category_levels ucl
        WHERE ucl.user_id = v_user_id
        HAVING COUNT(*) > 0
        AND NOT EXISTS (
            SELECT 1 FROM user_category_level_history h
            WHERE h.user_id     = v_user_id
              AND h.category_id IS NULL
              AND h.recorded_at::date = (NOW() - ((p_days - v_day) || ' days')::interval)::date
        );
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION fn_dev_seed_category_history(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_dev_seed_category_history(integer) TO authenticated;
