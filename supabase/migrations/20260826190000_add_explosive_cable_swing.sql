-- Explosive Cable Swing (User-Vorschlag 26.08.): Griff beidhändig, aus der
-- seitlichen Position explosiv wegschwingen — das beidhändige Kabel-Pendant
-- zum rotational_med_ball_throw (die einarmige Punch-Variante ist
-- explosive_rotational_cable_press). Region/Pattern wie der Med-Ball-Throw
-- (upper_back/core), Ausführung pro Seite.
-- Idempotent, prod-portierbar. Ohne Video/Thumbnail (wird nachgepflegt).

insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, is_unilateral, description_i18n)
select 'Explosive Cable Swing', 'explosive_cable_swing', c.id, 'upper_back', 'core', 15, 100, 6, 'dynamic', 'reps', 'unilateral', true,
  '{"de": "Griff beidhändig fassen, seitlich zum Kabelzug stehen und explosiv aus Hüfte und Rumpf wegschwingen, kontrolliert zurückführen. Beidhändige Rotationspower wie beim Med-Ball-Wurf — ohne Ball.", "en": "Grip the handle with both hands, stand sideways to the cable and swing away explosively from the hips and core, returning under control. Two-handed rotational power like a med ball throw — without the ball."}'::jsonb
from categories c
where c.slug = 'upper_body_plyometrics'
  and not exists (select 1 from exercises e where e.slug = 'explosive_cable_swing');

insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug in ('primary', 'secondary')
where e.slug = 'explosive_cable_swing'
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from exercises e
join equipments eq on eq.slug = 'cable_machine'
where e.slug = 'explosive_cable_swing'
  and not exists (
    select 1 from exercise_equipments ee
    where ee.exercise_id = e.id and ee.equipment_id = eq.id
  );

insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug = 'gym'
where e.slug = 'explosive_cable_swing'
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );
