-- ─────────────────────────────────────────────────────────────
-- Rework assessment creation logic:
-- Move the 28-day "cooldown" into fn_create_user_assessments
-- so that newly added assessment types are always filled in,
-- even when the user still has other pending assessments.
-- fn_renew_assessments_for_all_users simply runs for all
-- onboarded users and lets the per-assessment checks handle
-- duplicates and cooldowns.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_create_user_assessments(p_user_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO user_assessments (user_id, assessment_id, status)
    SELECT p_user_id, a.id, 'pending'
    FROM assessments a
    JOIN sport_category_relevance scr
        ON scr.category_id = a.category_id
    JOIN user_profiles up
        ON up.sport_id = scr.sport_id
        AND up.id = p_user_id
    WHERE
      -- User has all required equipment (or assessment needs none)
      NOT EXISTS (
          SELECT 1 FROM assessment_equipments ae
          WHERE ae.assessment_id = a.id
            AND NOT EXISTS (
                SELECT 1 FROM user_equipments ue
                WHERE ue.user_id = p_user_id
                  AND ue.equipment_id = ae.equipment_id
            )
      )
      -- Not already pending or in progress
      AND NOT EXISTS (
          SELECT 1 FROM user_assessments ua
          WHERE ua.user_id = p_user_id
            AND ua.assessment_id = a.id
            AND ua.status IN ('pending', 'in_progress')
      )
      -- Not completed within the last 28 days
      AND NOT EXISTS (
          SELECT 1 FROM user_assessments ua
          WHERE ua.user_id = p_user_id
            AND ua.assessment_id = a.id
            AND ua.status = 'completed'
            AND ua.completed_at > NOW() - INTERVAL '28 days'
      );
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- Simplified renewal: just call fn_create_user_assessments
-- for every onboarded user. Per-assessment checks handle
-- duplicates and the 28-day cooldown.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_renew_assessments_for_all_users()
RETURNS SETOF UUID AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT id AS user_id
        FROM user_profiles
        WHERE has_onboarded = true
          AND sport_id IS NOT NULL
    LOOP
        PERFORM fn_create_user_assessments(r.user_id);
        RETURN NEXT r.user_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
