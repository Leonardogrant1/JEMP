-- Push-up-Varianten in die Hauptblöcke (Befund aus der Pool-Analyse vom 26.08.):
-- strength hatte ohne Equipment 0 primary-fähige chest/tricep/upper_back-Übungen,
-- weil die Push-up-Familie fast komplett accessory-only getaggt war. Für User
-- ohne Equipment fehlte damit jeder tragfähige Oberkörper-Hauptblock.
--
--   primary + secondary: push_up (der Bodyweight-Grundlift, Lvl 1),
--     decline_push_up (Lvl 30), pike_push_up (der Bodyweight-Schulterdrücker,
--     Lvl 30), archer_push_up (unilateral schwer, Lvl 60)
--   secondary: wide_grip_push_up (Lvl 1), diamond_push_up (Lvl 30),
--     shoulder_tap_push_up (Lvl 30) — Varianten, kein Hauptreiz
--
-- Slug-basiert und idempotent; fehlende Übungen werden übersprungen (prod-portierbar).

-- ── primary + secondary ──────────────────────────────────────────────────────
insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug in ('primary', 'secondary')
where e.slug in (
    'push_up',
    'decline_push_up',
    'pike_push_up',
    'archer_push_up'
  )
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

-- ── nur secondary ────────────────────────────────────────────────────────────
insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug = 'secondary'
where e.slug in (
    'wide_grip_push_up',
    'diamond_push_up',
    'shoulder_tap_push_up'
  )
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );
