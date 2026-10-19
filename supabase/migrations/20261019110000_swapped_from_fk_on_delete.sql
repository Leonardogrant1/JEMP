-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Finding 6 (Fix-Wave 2026-10-19): swapped_from_exercise_id (20261019100000)
-- bekam implizit "on delete no action" — Exercise-Duplikat-Merges löschen
-- exercises-Zeilen in diesem Projekt regelmäßig (siehe project_exercise_duplicates),
-- ein NO ACTION würde diese Deletes blocken. "set null" statt "cascade": der
-- Hinweis "diese Zeile wurde getauscht" ist auch ohne Quell-Übung noch sinnvoll,
-- nur die Referenz selbst darf nicht mehr zeigen.
begin;
set local lock_timeout = '5s';

alter table workout_session_block_exercises
  drop constraint workout_session_block_exercises_swapped_from_exercise_id_fkey;

alter table workout_session_block_exercises
  add constraint workout_session_block_exercises_swapped_from_exercise_id_fkey
  foreign key (swapped_from_exercise_id) references exercises(id) on delete set null;

commit;
