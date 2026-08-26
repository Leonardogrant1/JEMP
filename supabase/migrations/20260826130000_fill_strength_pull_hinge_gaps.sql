-- Strength-Katalog-Lücken schließen (Befund 26.08.): ohne Equipment gab es
-- 0 primary-fähige glute-, 0 upper_back- (Pull!) und unter Lvl 30 keine
-- hamstring-Übungen — im Extremtest flog das Pull-Muster komplett aus dem Plan
-- ("Muster ohne Pool-Übungen entfernt: pull").
--
-- Teil 1 — Tagging (Übungen existieren, hingen als accessory-only fest):
--   dumbbell_row +primary+secondary (klassischer Main-Lift), dumbbell_swing
--   +primary (ballistischer Hinge), negative_pull_up +secondary (einziger
--   Pull-Hauptblock unter Lvl 15 mit Stange), banded_row +secondary,
--   wall_supported_hamstring_curl +secondary (Nordic-Vorstufe).
--   banded_row zusätzlich auf max_level 40 gekappt — kein Band-Rudern bei
--   Fortgeschrittenen (negative_pull_up/wall_curl sind schon bei 30 gekappt).
--
-- Teil 2 — neue equipment-freie Übungen: single_leg_hip_thrust (glute),
--   sliding_leg_curl (hamstring, Handtuch/Slider), table_inverted_row
--   (upper_back, Lvl-Kappung 50 — danach sind Geräte-Varianten realistischer).
--
-- Idempotent, prod-portierbar (fehlende Slugs werden übersprungen).

-- ── Teil 1: Tagging ──────────────────────────────────────────────────────────
insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug in ('primary', 'secondary')
where e.slug = 'dumbbell_row'
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug = 'primary'
where e.slug = 'dumbbell_swing'
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug = 'secondary'
where e.slug in ('negative_pull_up', 'banded_row', 'wall_supported_hamstring_curl')
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

update exercises
set max_level = 40
where slug = 'banded_row'
  and max_level > 40;

-- ── Teil 2: neue Übungen ─────────────────────────────────────────────────────
insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, is_unilateral, description_i18n)
select v.name, v.slug, c.id, v.body_region::body_region, v.movement_pattern::movement_pattern, v.min_level, v.max_level, v.intensity_score, 'dynamic', 'reps', v.laterality::laterality, v.is_unilateral, v.description_i18n::jsonb
from (values
  ('Single-Leg Hip Thrust', 'single_leg_hip_thrust', 'glute', 'legs', 10, 100, 6, 'unilateral', true,
   '{"de": "Einbeiniger Hip Thrust mit den Schultern auf einer Erhöhung (Couch, Stufe oder Bank): Hüfte explosiv strecken, oben kurz halten. Glute-Kraft ganz ohne Equipment.", "en": "Single-leg hip thrust with the shoulders on an elevated surface (couch, step or bench): extend the hips forcefully and pause at the top. Glute strength with zero equipment."}'),
  ('Sliding Leg Curl', 'sliding_leg_curl', 'hamstring', 'legs', 10, 100, 6, 'bilateral', false,
   '{"de": "Rückenlage, Fersen auf Handtuch oder Slidern: Hüfte anheben und die Fersen kontrolliert heranziehen und wieder ausfahren. Exzentrisch fordernde Hamstring-Arbeit ohne Geräte.", "en": "Lying on your back with heels on a towel or sliders: lift the hips, then pull the heels in and slide them back out under control. Eccentric-heavy hamstring work without machines."}'),
  ('Table Inverted Row', 'table_inverted_row', 'upper_back', 'pull', 1, 50, 5, 'bilateral', false,
   '{"de": "Rudern unter einem stabilen Tisch oder einer Kante: Körper gestreckt, Brust zur Kante ziehen. Der horizontale Zug für alle ohne Stange und Geräte.", "en": "Row underneath a sturdy table or ledge: body straight, pull the chest to the edge. The horizontal pull for anyone without a bar or machines."}')
) as v(name, slug, body_region, movement_pattern, min_level, max_level, intensity_score, laterality, is_unilateral, description_i18n)
join categories c on c.slug = 'strength'
where not exists (select 1 from exercises e where e.slug = v.slug);

insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug in ('primary', 'secondary')
where e.slug in ('single_leg_hip_thrust', 'sliding_leg_curl', 'table_inverted_row')
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

-- kein Equipment; Environments: überall (explizite Zeilen wie beim Bestand)
insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug in ('home', 'gym', 'outdoor')
where e.slug in ('single_leg_hip_thrust', 'sliding_leg_curl', 'table_inverted_row')
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );
