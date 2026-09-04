-- Ticket-Fix: Deep Squat Hold + Loaded Deep Squat Hold waren als einzige
-- Hold-Übungen 'reps_or_duration' — das LLM verordnete dadurch mal Zeit, mal
-- Wiederholungen für eine isometrische Halteübung ("20 kg × 9"). Alle anderen
-- Holds (Wall Sit, Dead Hang, Hollow Body Hold, ...) stehen fest auf duration.

UPDATE exercises SET measurement_type = 'duration'
WHERE slug IN ('deep_squat_hold', 'loaded_deep_squat_hold');

-- Bestehende Reps-Vorgaben in Plan-Templates und noch offenen Sessions auf
-- eine Halte-Dauer konvertieren (45s = Mittelfeld der üblichen 30-60s);
-- abgeschlossene/übersprungene Sessions bleiben als Historie unangetastet.

UPDATE workout_plan_session_block_exercises x
SET target_duration_seconds = 45, target_reps_min = NULL, target_reps_max = NULL
FROM exercises e
WHERE e.id = x.exercise_id
  AND e.slug IN ('deep_squat_hold', 'loaded_deep_squat_hold')
  AND COALESCE(x.target_duration_seconds, 0) = 0
  AND COALESCE(x.target_reps_min, 0) > 0;

UPDATE workout_session_block_exercises x
SET target_duration_seconds = 45, target_reps_min = NULL, target_reps_max = NULL
FROM exercises e, workout_session_blocks b, workout_sessions ws
WHERE e.id = x.exercise_id
  AND b.id = x.workout_session_block_id
  AND ws.id = b.workout_session_id
  AND ws.status = 'scheduled'
  AND e.slug IN ('deep_squat_hold', 'loaded_deep_squat_hold')
  AND COALESCE(x.target_duration_seconds, 0) = 0
  AND COALESCE(x.target_reps_min, 0) > 0;
