-- Rotational Med Ball Slam (28.09.): Drittes Muster neben medicine_ball_slam
-- (vertikal) und rotational_med_ball_throw (Wandwurf) — diagonaler Slam über
-- die Schulter mit Rumpfrotation, braucht keine Wand. Einordnung analog zu den
-- beiden Geschwistern. Ohne Video/Thumbnail (werden nachgepflegt). Idempotent.

insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, image_group, description_i18n)
select 'Rotational Med Ball Slam', 'rotational_med_ball_slam', c.id, 'obliques', 'core', 1, 100, 6, 'dynamic', 'reps_or_duration', 'alternating', 'medicine_ball',
  '{"de": "Den Medizinball über die Schulter führen und mit voller Rumpfrotation diagonal neben dem Körper auf den Boden schlagen, Seite wechseln. Rotations-Power im Chop-Muster — ohne Wand ausführbar.", "en": "Bring the medicine ball over your shoulder and slam it diagonally into the ground beside you with full trunk rotation, then switch sides. Rotational power in a chop pattern — no wall needed."}'::jsonb
from categories c
where c.slug = 'upper_body_plyometrics'
  and not exists (select 1 from exercises e where e.slug = 'rotational_med_ball_slam');

insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug in ('primary', 'secondary')
where e.slug = 'rotational_med_ball_slam'
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from exercises e
join equipments eq on eq.slug = 'medicine_ball'
where e.slug = 'rotational_med_ball_slam'
  and not exists (
    select 1 from exercise_equipments ee
    where ee.exercise_id = e.id and ee.equipment_id = eq.id
  );

insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug in ('gym', 'home', 'outdoor')
where e.slug = 'rotational_med_ball_slam'
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );
