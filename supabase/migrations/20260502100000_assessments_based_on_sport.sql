-- ─────────────────────────────────────────────────────────────
-- Update fn_create_user_assessments to base assessments on the
-- user's sport (via sport_category_relevance) instead of only
-- their manually selected targeted categories.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_create_user_assessments(p_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Insert pending assessments for all assessments where:
    -- 1. The assessment's category is relevant for the user's sport
    -- 2. The user has all required equipment for the assessment
    -- 3. No pending/in_progress assessment already exists for this user+assessment
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
      -- No duplicate pending
      AND NOT EXISTS (
          SELECT 1 FROM user_assessments ua
          WHERE ua.user_id = p_user_id
            AND ua.assessment_id = a.id
            AND ua.status IN ('pending', 'in_progress')
      );
END;
$$ LANGUAGE plpgsql;
