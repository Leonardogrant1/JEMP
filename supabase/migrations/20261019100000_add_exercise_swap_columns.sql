-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Exercise Swap (Spec 2026-10-19): Pattern-/Emphasis-Zuordnung wird beim
-- Materialisieren mitgeschrieben (Heavy-Filter ohne Raten, Pattern-Bindung
-- gegen Coverage-Bruch); swapped_from markiert getauschte Zeilen.
-- Owner-UPDATE-Policy existiert seit 20260419081707 — hier nur Spalten.
begin;
set local lock_timeout = '5s';

alter table workout_plan_session_block_exercises
  add column if not exists assigned_pattern text,
  add column if not exists pattern_emphasis text check (pattern_emphasis in ('heavy', 'normal'));

alter table workout_session_block_exercises
  add column if not exists assigned_pattern text,
  add column if not exists pattern_emphasis text check (pattern_emphasis in ('heavy', 'normal')),
  add column if not exists swapped_from_exercise_id uuid references exercises(id);

commit;
