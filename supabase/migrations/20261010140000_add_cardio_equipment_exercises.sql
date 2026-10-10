-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Cardio-Equipment + Dauer-Übungen (Spec 2026-10-10 §7): eine Übung pro Gerät,
-- das Format dosiert sie (extensiv = lange moderate Intervalle, intensiv =
-- 30/30, rounds = 3-min-Runden). Equipment-Labels kommen aus name_i18n —
-- die App braucht kein neues Icon-/i18n-Mapping. Ohne Video/Thumbnail
-- (werden nachgepflegt). Idempotent.

begin;
set local lock_timeout = '5s';

insert into equipments (slug, name_i18n, is_location_specific)
select v.slug, v.name_i18n::jsonb, true
from (values
  ('treadmill',       '{"de": "Laufband", "en": "Treadmill"}'),
  ('stationary_bike', '{"de": "Ergometer / Fahrrad", "en": "Stationary Bike"}'),
  ('air_bike',        '{"de": "Air Bike / Assault Bike", "en": "Air Bike"}'),
  ('rowing_erg',      '{"de": "Rudergerät", "en": "Rowing Machine"}'),
  ('heavy_bag',       '{"de": "Boxsack", "en": "Heavy Bag"}')
) as v(slug, name_i18n)
where not exists (select 1 from equipments e where e.slug = v.slug);

-- Ortsbindung: gym + home (outdoor bewusst nicht)
insert into environment_equipments (environment_id, equipment_id)
select env.id, eq.id
from equipments eq
join environments env on env.slug in ('gym', 'home')
where eq.slug in ('treadmill', 'stationary_bike', 'air_bike', 'rowing_erg', 'heavy_bag')
  and not exists (
    select 1 from environment_equipments ee
    where ee.environment_id = env.id and ee.equipment_id = eq.id
  );

insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level,
  intensity_score, exercise_type, measurement_type, laterality, image_group, movement_type, is_explosive, description_i18n)
select v.name, v.slug, c.id, 'full_body', 'cardio', 1, 100,
  v.intensity, 'dynamic', 'duration', 'bilateral', 'conditioning', v.movement_type::movement_type, false, v.descr::jsonb
from (values
  ('Treadmill Run', 'treadmill_run', 4, 'sagittal',
   '{"de": "Laufen auf dem Laufband — das Tempo bestimmt die Verschreibung: locker für die aerobe Basis, zügig für Intervalle.", "en": "Running on the treadmill — the prescription sets the pace: easy for the aerobic base, brisk for intervals."}'),
  ('Stationary Bike', 'stationary_bike_ride', 4, 'sagittal',
   '{"de": "Fahren auf dem Ergometer — gelenkschonende Dauerarbeit oder Intervalle, der Widerstand folgt der Verschreibung.", "en": "Riding the stationary bike — joint-friendly steady work or intervals, resistance follows the prescription."}'),
  ('Air Bike', 'air_bike_ride', 6, 'sagittal',
   '{"de": "Air Bike mit Arm- und Beinarbeit — der Luftwiderstand skaliert mit deinem Einsatz, ideal für harte Intervalle.", "en": "Air bike with arm and leg drive — air resistance scales with your effort, ideal for hard intervals."}'),
  ('Rowing', 'rowing_erg', 5, 'sagittal',
   '{"de": "Rudern am Ergometer — Ganzkörper-Dauerarbeit mit sauberem Rhythmus: Beine, Rumpf, Arme.", "en": "Rowing on the erg — full-body steady work with clean rhythm: legs, trunk, arms."}'),
  ('Heavy Bag Work', 'heavy_bag_work', 6, 'transverse',
   '{"de": "Schlag- und Tritt-Arbeit am Sack — Runden bei sauberer Technik, Intensität über Schlagfrequenz steuern.", "en": "Punch and kick work on the bag — rounds with clean technique, control intensity via strike rate."}')
) as v(name, slug, intensity, movement_type, descr)
join categories c on c.slug = 'conditioning'
where not exists (select 1 from exercises e where e.slug = v.slug);

insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from (values
  ('treadmill_run', 'treadmill'), ('stationary_bike_ride', 'stationary_bike'),
  ('air_bike_ride', 'air_bike'), ('rowing_erg', 'rowing_erg'), ('heavy_bag_work', 'heavy_bag')
) as v(ex_slug, eq_slug)
join exercises e on e.slug = v.ex_slug
join equipments eq on eq.slug = v.eq_slug
where not exists (
  select 1 from exercise_equipments xe
  where xe.exercise_id = e.id and xe.equipment_id = eq.id
);

insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug in ('gym', 'home')
where e.slug in ('treadmill_run', 'stationary_bike_ride', 'air_bike_ride', 'rowing_erg', 'heavy_bag_work')
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );

commit;
