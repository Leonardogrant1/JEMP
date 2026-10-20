-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Flexible Session Window (Spec 2026-10-09): Sprint-/Mobility-Sessions tragen
-- die erlaubten Wochentage (1-7); day_of_week bleibt die Empfehlung. null = fest
-- gepinnt (Workouts, Legacy-Pläne).
ALTER TABLE workout_plan_sessions
  ADD COLUMN flexible_window smallint[] DEFAULT NULL;

COMMENT ON COLUMN workout_plan_sessions.flexible_window IS 'Erlaubte Wochentage (1-7) für flexible Ausführung; day_of_week = Empfehlung. null = fest gepinnt.';
