-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Gewichtete Pattern-Fenster (QA 19.10., Basketball-Befund): Band-Übungen in
-- den Kraft-Pattern-Pools standen mit Intensität 5 gleichauf mit den Hantel-
-- Klassikern (banded_row neben dumbbell_row) und wurden von der Fenster-
-- Rotation regelmäßig ins Gym-Fenster gespült. Intensität 4 = Activation-
-- Stufe: Das Score-Fenster zieht sie nur noch, wenn der Pool sonst nichts
-- hergibt (Home-/Band-only-User) — der Heavy-Filter (>=5) schloss sie schon
-- immer aus.
begin;
set local lock_timeout = '5s';

update exercises set intensity_score = 4, updated_at = now()
where slug in (
  'banded_row',
  'banded_overhead_press',
  'banded_hip_thrust',
  'banded_chest_press_floor',
  'banded_romanian_deadlift'
) and intensity_score = 5;

commit;
