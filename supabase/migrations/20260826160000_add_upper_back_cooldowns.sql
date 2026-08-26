-- Letzte Cooldown-Lücke: upper_back hatte ohne Equipment 0 Cooldowns (nur
-- lat_foam_roll mit Rolle). Zwei Neuzugänge (26.08.):
--   dead_hang — Dekompression an der Stange (pull_up_bar), auch als Warmup
--   kneeling_lat_stretch — der equipment-freie Lat-Stretch, schließt die Zelle
-- Idempotent, prod-portierbar. Ohne Video/Thumbnail (werden nachgepflegt).

insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, is_unilateral, description_i18n)
select v.name, v.slug, c.id, 'upper_back', 'mobility', 1, 100, v.intensity_score, 'restorative', 'duration', 'bilateral', false, v.description_i18n::jsonb
from (values
  ('Dead Hang', 'dead_hang', 2,
   '{"de": "Mit gestreckten Armen an der Stange hängen, Schultern lang lassen und ruhig atmen. Dekomprimiert Wirbelsäule und Lat und baut nebenbei Griffkraft auf.", "en": "Hang from the bar with straight arms, let the shoulders lengthen and breathe calmly. Decompresses the spine and lats while quietly building grip strength."}'),
  ('Kneeling Lat Stretch', 'kneeling_lat_stretch', 1,
   '{"de": "Im Kniestand die Hände weit nach vorne wandern lassen, Brust Richtung Boden sinken lassen und die Dehnung im Lat und oberen Rücken halten. Ganz ohne Hilfsmittel.", "en": "From a kneeling position, walk the hands far forward, sink the chest toward the floor and hold the stretch through the lats and upper back. No equipment needed."}')
) as v(name, slug, intensity_score, description_i18n)
join categories c on c.slug = 'mobility'
where not exists (select 1 from exercises e where e.slug = v.slug);

-- dead_hang wie thread_the_needle in beiden Pools, der Stretch nur cooldown
insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug in ('cooldown', 'warmup')
where e.slug = 'dead_hang'
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug = 'cooldown'
where e.slug = 'kneeling_lat_stretch'
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from exercises e
join equipments eq on eq.slug = 'pull_up_bar'
where e.slug = 'dead_hang'
  and not exists (
    select 1 from exercise_equipments ee
    where ee.exercise_id = e.id and ee.equipment_id = eq.id
  );

insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug in ('home', 'gym', 'outdoor')
where e.slug in ('dead_hang', 'kneeling_lat_stretch')
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );

-- Datenfix nebenbei: thread_the_needle wird seitenweise ausgeführt,
-- stand aber auf bilateral
update exercises
set laterality = 'unilateral', is_unilateral = true
where slug = 'thread_the_needle'
  and laterality = 'bilateral';
