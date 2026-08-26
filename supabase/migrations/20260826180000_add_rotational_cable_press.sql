-- Explosive Rotational Cable Press (User-Vorschlag 26.08.): seitlich zum
-- Kabelzug, explosive Rotation weg vom Turm mit Armstreckung — Rotations-
-- Schlagkraft als Kabel-Pendant zum rotational_med_ball_throw. Ergänzt die
-- Landmine/Cable-Familie für Gyms ohne Medizinball.
-- Idempotent, prod-portierbar. Ohne Video/Thumbnail (wird nachgepflegt).

insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, is_unilateral, description_i18n)
select 'Explosive Rotational Cable Press', 'explosive_rotational_cable_press', c.id, 'shoulder', 'push', 20, 100, 6, 'dynamic', 'reps', 'unilateral', true,
  '{"de": "Seitlich zum Kabelzug stehen, explosiv vom Turm wegrotieren und den Arm wie bei einem Punch strecken, kontrolliert zurückführen. Rotations-Schlagkraft aus Hüfte und Rumpf.", "en": "Stand sideways to the cable, rotate explosively away from the stack and extend the arm like a punch, then return under control. Rotational striking power driven by hips and core."}'::jsonb
from categories c
where c.slug = 'upper_body_plyometrics'
  and not exists (select 1 from exercises e where e.slug = 'explosive_rotational_cable_press');

insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug in ('primary', 'secondary')
where e.slug = 'explosive_rotational_cable_press'
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from exercises e
join equipments eq on eq.slug = 'cable_machine'
where e.slug = 'explosive_rotational_cable_press'
  and not exists (
    select 1 from exercise_equipments ee
    where ee.exercise_id = e.id and ee.equipment_id = eq.id
  );

insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug = 'gym'
where e.slug = 'explosive_rotational_cable_press'
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );
