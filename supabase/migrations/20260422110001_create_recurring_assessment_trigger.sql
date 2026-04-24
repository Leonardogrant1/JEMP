-- ─────────────────────────────────────────────────────────────
-- Function: create pending user_assessments for a user
-- based on their category levels and available equipment.
-- Called on plan creation and every 4 weeks via the trigger.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_create_user_assessments(p_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Insert pending assessments for all assessments where:
    -- 1. The assessment's category matches the user's targeted categories
    -- 2. The user has all required equipment for the assessment
    -- 3. No pending/in_progress assessment already exists for this user+assessment
    INSERT INTO user_assessments (user_id, assessment_id, status)
    SELECT p_user_id, a.id, 'pending'
    FROM assessments a
    JOIN user_targeted_categories utc
        ON utc.category_id = a.category_id
        AND utc.user_id = p_user_id
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

-- ─────────────────────────────────────────────────────────────
-- Function: auto-create new assessments when the last batch
-- was completed more than 4 weeks ago.
-- Triggered when a user_assessment is completed.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_check_assessment_renewal()
RETURNS TRIGGER AS $$
DECLARE
    last_batch_date TIMESTAMPTZ;
    has_pending BOOLEAN;
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
        -- Check if user still has pending assessments
        SELECT EXISTS (
            SELECT 1 FROM user_assessments
            WHERE user_id = NEW.user_id
              AND status IN ('pending', 'in_progress')
        ) INTO has_pending;

        -- If no pending left, check if 4 weeks passed since last creation
        IF NOT has_pending THEN
            SELECT MAX(created_at) INTO last_batch_date
            FROM user_assessments
            WHERE user_id = NEW.user_id;

            IF last_batch_date IS NULL OR (NOW() - last_batch_date) >= INTERVAL '28 days' THEN
                PERFORM fn_create_user_assessments(NEW.user_id);
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assessment_renewal
    AFTER UPDATE OF status ON user_assessments
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION fn_check_assessment_renewal();

-- ─────────────────────────────────────────────────────────────
-- Cron: create new assessments every 4 weeks for all users
-- who have no pending assessments and whose last batch is >28d old.
-- Runs every Monday at 06:00 UTC.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_renew_assessments_for_all_users()
RETURNS SETOF UUID AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT DISTINCT up.id AS user_id
        FROM user_profiles up
        JOIN user_targeted_categories utc ON utc.user_id = up.id
        WHERE up.has_onboarded = true
          AND NOT EXISTS (
              SELECT 1 FROM user_assessments ua
              WHERE ua.user_id = up.id
                AND ua.status IN ('pending', 'in_progress')
          )
          AND (
              NOT EXISTS (
                  SELECT 1 FROM user_assessments ua WHERE ua.user_id = up.id
              )
              OR (
                  SELECT MAX(created_at) FROM user_assessments ua WHERE ua.user_id = up.id
              ) < NOW() - INTERVAL '28 days'
          )
    LOOP
        PERFORM fn_create_user_assessments(r.user_id);
        RETURN NEXT r.user_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- Cron: call edge function every Monday at 06:00 UTC
-- Uses pg_net to make HTTP POST to the edge function
-- ─────────────────────────────────────────────────────────────

SELECT cron.schedule(
    'renew-user-assessments',
    '0 6 * * 1',
    $$
    SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/create-user-assessments',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);
