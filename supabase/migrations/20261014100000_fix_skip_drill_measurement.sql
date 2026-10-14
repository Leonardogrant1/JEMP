-- QA-Fix 14.10.: A-Skip/B-Skip waren als einzige Lauf-ABC-Drills noch
-- 'reps_or_duration' — das LLM verordnete dadurch Wiederholungen ("10-20
-- Wdh.") für eine rhythmische Laufübung. Die Geschwister high_knees und
-- butt_kicks stehen fest auf duration; der Mess-Typ-Validator (QA 11.10.)
-- nennt den A-Skip sogar als Beispiel, die Daten fehlten aber. In
-- Speed-Sessions bleiben die Drills distanz-dosiert (2×20 m) — Distanz-
-- Zeilen werden darum nicht angefasst. Idempotent.

UPDATE exercises SET measurement_type = 'duration'
WHERE slug IN ('a_skip_drill', 'b_skip_drill');

-- Bestehende Reps-Vorgaben auf Dauer konvertieren (15s = übliche Drill-Dose;
-- hat die Zeile schon eine Dauer, bleibt sie und nur die Reps fallen weg).
-- Distanz-dosierte Zeilen (Speed-Warmup) und Historie bleiben unangetastet.

UPDATE workout_plan_session_block_exercises x
SET target_duration_seconds = COALESCE(NULLIF(x.target_duration_seconds, 0), 15),
    target_reps_min = NULL, target_reps_max = NULL
FROM exercises e
WHERE e.id = x.exercise_id
  AND e.slug IN ('a_skip_drill', 'b_skip_drill')
  AND COALESCE(x.target_reps_min, 0) > 0
  AND COALESCE(x.target_distance_meters, 0) = 0;

UPDATE workout_session_block_exercises x
SET target_duration_seconds = COALESCE(NULLIF(x.target_duration_seconds, 0), 15),
    target_reps_min = NULL, target_reps_max = NULL
FROM exercises e, workout_session_blocks b, workout_sessions ws
WHERE e.id = x.exercise_id
  AND b.id = x.workout_session_block_id
  AND ws.id = b.workout_session_id
  AND ws.status = 'scheduled'
  AND e.slug IN ('a_skip_drill', 'b_skip_drill')
  AND COALESCE(x.target_reps_min, 0) > 0
  AND COALESCE(x.target_distance_meters, 0) = 0;
