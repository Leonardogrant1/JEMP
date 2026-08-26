-- Übungsknappheit upper_body_plyometrics beheben (Befund 26.08.): ohne
-- Medizinball hatte die Kategorie genau 1 primary-fähige Übung (clap_push_up,
-- erst ab Lvl 30) — der Auslöser des 1-Übungs-Primary-Blocks in Prod.
--
-- 7 neue Übungen, zwei Lücken:
--   Gym ohne Medizinball: landmine_punch_throw, landmine_switch_punch,
--     explosive_cable_press, explosive_cable_row (Row füllt nebenbei die
--     explosive Pull-Lücke)
--   Kein Equipment / Einsteiger (< Lvl 30 gab es NULL Übungen):
--     kneeling_plyo_push_up (Lvl 1–20), incline_plyo_push_up, depth_push_up
--
-- Ohne Video/Thumbnail (werden nachgepflegt). Idempotent, prod-portierbar.

-- ── Übungen ──────────────────────────────────────────────────────────────────
insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, is_unilateral, description_i18n)
select v.name, v.slug, c.id, v.body_region::body_region, v.movement_pattern::movement_pattern, v.min_level, v.max_level, v.intensity_score, 'dynamic', 'reps', v.laterality::laterality, v.is_unilateral, v.description_i18n::jsonb
from (values
  ('Landmine Punch Throw', 'landmine_punch_throw', 'shoulder', 'push', 20, 100, 6, 'unilateral', true,
   '{"de": "Explosiver einarmiger Punch mit der Landmine: Stange beschleunigen, kurz loslassen und wieder auffangen. Trainiert ballistische Druckkraft im Schulterbereich.", "en": "Explosive single-arm landmine punch: accelerate the bar, release briefly and catch it again. Builds ballistic pressing power through the shoulder."}'),
  ('Landmine Switch Punch', 'landmine_switch_punch', 'shoulder', 'push', 35, 100, 7, 'unilateral', true,
   '{"de": "Landmine anheben, Übergabe auf die andere Hand und direkt aus dem Auffangen explosiv punchen. Die Catch-Phase erzwingt einen schnellen Dehnungs-Verkürzungs-Zyklus.", "en": "Lift the landmine, switch hands and punch explosively straight out of the catch. The catch phase forces a rapid stretch-shortening cycle."}'),
  ('Explosive Cable Press', 'explosive_cable_press', 'chest', 'push', 15, 100, 5, 'unilateral', true,
   '{"de": "Einarmiges Drücken am Kabelzug mit maximaler Beschleunigung. Ballistische Druckkraft mit konstantem Widerstand und leichtem Einstieg.", "en": "Single-arm cable press performed with maximal acceleration. Ballistic pressing power with constant resistance and an accessible entry point."}'),
  ('Explosive Cable Row', 'explosive_cable_row', 'upper_back', 'pull', 15, 100, 5, 'bilateral', false,
   '{"de": "Rudern am Kabelzug mit explosivem Zug und kontrolliertem Nachlassen. Baut explosive Zugkraft im oberen Rücken auf.", "en": "Cable row with an explosive pull and controlled return. Develops explosive pulling power through the upper back."}'),
  ('Kneeling Plyo Push-up', 'kneeling_plyo_push_up', 'chest', 'plyometric', 1, 20, 5, 'bilateral', false,
   '{"de": "Plyo Push-up aus dem Kniestand: explosiv abdrücken, bis die Hände den Boden verlassen. Der Einstieg in reaktive Oberkörper-Power.", "en": "Plyo push-up from the knees: press off explosively until the hands leave the floor. The entry point for reactive upper-body power."}'),
  ('Incline Plyo Push-up', 'incline_plyo_push_up', 'chest', 'plyometric', 10, 100, 5, 'bilateral', false,
   '{"de": "Plyo Push-up mit erhöhten Händen (Bank, Box oder Fensterbrett): explosiv abdrücken, Hände heben ab. Reduzierte Last, voller Geschwindigkeitsreiz.", "en": "Plyo push-up with hands elevated (bench, box or ledge): press off explosively so the hands leave the surface. Reduced load, full speed stimulus."}'),
  ('Depth Push-up', 'depth_push_up', 'chest', 'plyometric', 45, 100, 8, 'bilateral', false,
   '{"de": "Hände fallen von zwei Erhöhungen auf den Boden, Impact abfedern und sofort explosiv nach oben drücken. Die intensivste Form des reaktiven Oberkörpertrainings.", "en": "Drop the hands from two raised surfaces, absorb the impact and immediately press up explosively. The most intense form of reactive upper-body training."}')
) as v(name, slug, body_region, movement_pattern, min_level, max_level, intensity_score, laterality, is_unilateral, description_i18n)
join categories c on c.slug = 'upper_body_plyometrics'
where not exists (select 1 from exercises e where e.slug = v.slug);

-- ── Block-Tags: alle primary + secondary ─────────────────────────────────────
insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug in ('primary', 'secondary')
where e.slug in (
    'landmine_punch_throw', 'landmine_switch_punch',
    'explosive_cable_press', 'explosive_cable_row',
    'kneeling_plyo_push_up', 'incline_plyo_push_up', 'depth_push_up'
  )
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

-- ── Equipment: Landmine = barbell (wie landmine_press), Cable = cable_machine ─
insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from exercises e
join equipments eq on eq.slug = 'barbell'
where e.slug in ('landmine_punch_throw', 'landmine_switch_punch')
  and not exists (
    select 1 from exercise_equipments ee
    where ee.exercise_id = e.id and ee.equipment_id = eq.id
  );

insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from exercises e
join equipments eq on eq.slug = 'cable_machine'
where e.slug in ('explosive_cable_press', 'explosive_cable_row')
  and not exists (
    select 1 from exercise_equipments ee
    where ee.exercise_id = e.id and ee.equipment_id = eq.id
  );

-- ── Environments: Landmine/Cable nur gym (wie landmine_press/cable_chop); ────
-- Push-up-Varianten überall (explizite Zeilen wie bei clap_push_up)
insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug = 'gym'
where e.slug in (
    'landmine_punch_throw', 'landmine_switch_punch',
    'explosive_cable_press', 'explosive_cable_row'
  )
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );

insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug in ('home', 'gym', 'outdoor')
where e.slug in ('kneeling_plyo_push_up', 'incline_plyo_push_up', 'depth_push_up')
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );
