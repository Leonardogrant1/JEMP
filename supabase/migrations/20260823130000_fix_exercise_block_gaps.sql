-- Bestehende Übungen konsistent machen (Befunde aus der Block-Type-Analyse vom 23.08.):
--   1. dumbbell_split_drop_catches: intensity_score fehlt (NULL rutscht durch ALLE
--      Mode-Filter, auch recovery) und keine Block-Tags -> 7 + primary/secondary,
--      analog zu den dumbbell_complex-Geschwistern (thruster 6, clean/snatch 9).
--   2. single_leg_reactive_box_jump: einzige primary-only-Übung, alle anderen
--      Intensity-9-Übungen sind primary+secondary -> secondary ergänzen.
--   3. secondary-only-Cluster (burpee, dumbbell_swing, jump_rope_double_under,
--      agility_ladder_single_leg_hops, sl_romanian_deadlift): accessory ergänzen
--      -> gleiche Stufe wie push_up (accessory+secondary = "kein Hauptlift,
--      aber mehr als Accessory").
-- Slug-basiert und idempotent; Übungen, die es in der jeweiligen DB nicht gibt
-- (einige existieren nur in Prod), werden übersprungen (prod-portierbar).

-- ── 1. Dumbbell Split Drop Catches ─────────────────────────────────────────
update exercises
set intensity_score = 7
where slug = 'dumbbell_split_drop_catches'
  and intensity_score is null;

insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug in ('primary', 'secondary')
where e.slug = 'dumbbell_split_drop_catches'
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

-- ── 2. Single Leg Reactive Box Jump: secondary ergänzen ────────────────────
insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug = 'secondary'
where e.slug = 'single_leg_reactive_box_jump'
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

-- ── 3. secondary-only-Cluster: accessory ergänzen ──────────────────────────
insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug = 'accessory'
where e.slug in (
    'burpee',
    'dumbbell_swing',
    'jump_rope_double_under',
    'agility_ladder_single_leg_hops',
    'sl_romanian_deadlift'
  )
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );
