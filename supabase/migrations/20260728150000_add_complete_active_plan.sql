-- ─────────────────────────────────────────────────────────────
-- Creator tool: complete the caller's active plan with seeded logs.
-- Backdates the plan so it ended yesterday, marks all sessions
-- completed, seeds performed sets derived from the target values
-- with a weekly progression (so first→last session shows gains),
-- and writes start/end category-level snapshots. Idempotent:
-- exercises that already have performed sets are skipped; existing
-- history rows on the two snapshot dates are replaced (a daily cron
-- may have written rows on those dates that would otherwise mask the
-- seeded start-dip and end values).
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_dev_complete_active_plan()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id    uuid := auth.uid();
    v_plan_id    uuid;
    v_start_date date;
    v_end_date   date;
    v_offset     integer;
BEGIN
    PERFORM fn_assert_creator_role();

    SELECT id, start_date, end_date
    INTO v_plan_id, v_start_date, v_end_date
    FROM workout_plans
    WHERE user_id = v_user_id
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_plan_id IS NULL THEN
        RAISE EXCEPTION 'no active plan';
    END IF;

    -- 1) Backdate so the plan ended yesterday
    v_offset := v_end_date - (CURRENT_DATE - 1);
    IF v_offset > 0 THEN
        UPDATE workout_plans
        SET start_date = start_date - v_offset,
            end_date   = end_date   - v_offset,
            updated_at = NOW()
        WHERE id = v_plan_id;

        UPDATE workout_sessions
        SET scheduled_at = scheduled_at - make_interval(days => v_offset),
            updated_at   = NOW()
        WHERE workout_plan_id = v_plan_id;

        v_start_date := v_start_date - v_offset;
        v_end_date   := v_end_date   - v_offset;
    END IF;

    -- 2) Complete all remaining sessions
    UPDATE workout_sessions
    SET status       = 'completed',
        started_at   = scheduled_at,
        completed_at = scheduled_at + interval '1 hour',
        updated_at   = NOW()
    WHERE workout_plan_id = v_plan_id
      AND status IN ('scheduled', 'in_progress');

    -- 3) Seed performed sets with weekly progression.
    --    Only primary/secondary/accessory blocks; exercises that
    --    already have any performed sets are skipped (idempotency).
    INSERT INTO workout_session_performed_sets (
        workout_session_id,
        workout_session_block_id,
        workout_session_block_exercise_id,
        set_number,
        side,
        performed_reps,
        performed_load_value,
        performed_duration_seconds,
        performed_rpe
    )
    SELECT
        ws.id,
        wsb.id,
        wsbe.id,
        gs.set_number,
        'bilateral',
        CASE
            WHEN COALESCE(wsbe.recommended_load_value, wsbe.target_load_value) IS NOT NULL
                 AND wsbe.target_load_type IS DISTINCT FROM 'bodyweight'
                THEN COALESCE(
                    (wsbe.target_reps_min + wsbe.target_reps_max) / 2,
                    wsbe.target_reps_min, wsbe.target_reps_max, 8)
            WHEN wsbe.target_reps_min IS NOT NULL OR wsbe.target_reps_max IS NOT NULL
                THEN COALESCE(wsbe.target_reps_min, wsbe.target_reps_max, 8) + wk.week
            ELSE NULL
        END,
        CASE
            WHEN COALESCE(wsbe.recommended_load_value, wsbe.target_load_value) IS NOT NULL
                 AND wsbe.target_load_type IS DISTINCT FROM 'bodyweight'
                THEN round((COALESCE(wsbe.recommended_load_value, wsbe.target_load_value)
                     * (0.92 + 0.04 * wk.week))::numeric * 2) / 2
            ELSE NULL
        END,
        CASE
            WHEN COALESCE(wsbe.recommended_load_value, wsbe.target_load_value) IS NULL
                 AND wsbe.target_reps_min IS NULL AND wsbe.target_reps_max IS NULL
                 AND wsbe.target_duration_seconds IS NOT NULL
                THEN round(wsbe.target_duration_seconds * (0.90 + 0.05 * wk.week))::integer
            ELSE NULL
        END,
        6 + floor(random() * 3)::integer
    FROM workout_sessions ws
    JOIN workout_session_blocks wsb
        ON wsb.workout_session_id = ws.id
    JOIN block_types bt
        ON bt.id = wsb.block_type_id
        AND bt.slug IN ('primary', 'secondary', 'accessory')
    JOIN workout_session_block_exercises wsbe
        ON wsbe.workout_session_block_id = wsb.id
    CROSS JOIN LATERAL (
        SELECT LEAST(3, GREATEST(0, (ws.scheduled_at::date - v_start_date) / 7)) AS week
    ) wk
    CROSS JOIN LATERAL generate_series(1, COALESCE(wsbe.target_sets, 3)) AS gs(set_number)
    WHERE ws.workout_plan_id = v_plan_id
      AND ws.scheduled_at IS NOT NULL
      -- exercise must have at least one usable target value
      AND (
          COALESCE(wsbe.recommended_load_value, wsbe.target_load_value) IS NOT NULL
          OR wsbe.target_reps_min IS NOT NULL
          OR wsbe.target_reps_max IS NOT NULL
          OR wsbe.target_duration_seconds IS NOT NULL
      )
      AND NOT EXISTS (
          SELECT 1 FROM workout_session_performed_sets p
          WHERE p.workout_session_block_exercise_id = wsbe.id
      );

    -- 4) Category-level snapshots at plan start (levels - 8) and plan end (current levels).
    --    Delete any existing rows on both snapshot dates first so that daily-cron entries
    --    written by fn_take_category_level_snapshot cannot mask the seeded deltas.
    DELETE FROM user_category_level_history
    WHERE user_id = v_user_id
      AND recorded_at::date IN (v_start_date, v_end_date);

    INSERT INTO user_category_level_history (user_id, category_id, level_score, recorded_at)
    SELECT v_user_id, ucl.category_id, GREATEST(1, ucl.level_score - 8),
           v_start_date::timestamptz + interval '8 hours'
    FROM user_category_levels ucl
    WHERE ucl.user_id = v_user_id;

    INSERT INTO user_category_level_history (user_id, category_id, level_score, recorded_at)
    SELECT v_user_id, NULL, GREATEST(1, ROUND(AVG(ucl.level_score))::integer - 8),
           v_start_date::timestamptz + interval '8 hours'
    FROM user_category_levels ucl
    WHERE ucl.user_id = v_user_id
    HAVING COUNT(*) > 0;

    INSERT INTO user_category_level_history (user_id, category_id, level_score, recorded_at)
    SELECT v_user_id, ucl.category_id, ucl.level_score,
           v_end_date::timestamptz + interval '8 hours'
    FROM user_category_levels ucl
    WHERE ucl.user_id = v_user_id;

    INSERT INTO user_category_level_history (user_id, category_id, level_score, recorded_at)
    SELECT v_user_id, NULL, ROUND(AVG(ucl.level_score))::integer,
           v_end_date::timestamptz + interval '8 hours'
    FROM user_category_levels ucl
    WHERE ucl.user_id = v_user_id
    HAVING COUNT(*) > 0;
END;
$$;

REVOKE ALL ON FUNCTION fn_dev_complete_active_plan() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_dev_complete_active_plan() TO authenticated;
