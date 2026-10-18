-- Equipment-Backfill für die Onboarding-Bug-Kohorte (Env-Wechsel-Bug, gefixt
-- im Sommer; ~82 Gym-User auf Prod ohne jegliches Equipment). Seit dem
-- Filter-Fix vom 18.10. heißt leeres Equipment "bodyweight-only" — diese
-- User bekämen bei einer Regeneration Bodyweight-Pläne, obwohl sie im Gym
-- trainieren. Sie erhalten das Gym-Standard-Set aus environment_equipments
-- (datengetrieben statt hartkodiert); der Re-Prompt in der App kann es
-- danach individuell verfeinern. Idempotent: User mit irgendeinem Equipment
-- werden nie angefasst.

INSERT INTO user_equipments (user_id, equipment_id)
SELECT DISTINCT p.id, ee.equipment_id
FROM user_profiles p
JOIN user_environments ue ON ue.user_id = p.id
JOIN environments v ON v.id = ue.environment_id AND v.slug = 'gym'
JOIN environment_equipments ee ON ee.environment_id = v.id
WHERE NOT EXISTS (SELECT 1 FROM user_equipments uq WHERE uq.user_id = p.id)
ON CONFLICT DO NOTHING;
