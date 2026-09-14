-- Kettlebell-Abdeckung (12.09.): Kettlebell ist im Onboarding wählbares
-- Equipment, aber es existierten nur 2 verknüpfte Übungen (Prod) bzw. 0
-- (lokal) — ein User mit nur einer Kettlebell bekam praktisch nichts.
--
-- Ansatz: KEINE Fast-Duplikate anlegen. Bestehende Dumbbell-Übungen, die mit
-- einer Kettlebell biomechanisch 1:1 funktionieren, zusätzlich mit kettlebell
-- taggen (Equipment-Filter ist ANY-of). Bewusst NICHT getaggt: Lateral Raise,
-- Curls, Trizeps-Extensions, Incline Press, Renegade Row (mit KB unsauber).
-- Nur 2 echte Lücken neu: Goblet Squat + Turkish Get-up (mit KB ODER DB).
--
-- Ohne Video/Thumbnail (werden nachgepflegt). Idempotent, prod-portierbar
-- (Slugs, die auf einer Seite fehlen, werden durch die Joins übersprungen).

-- 1. Kettlebell-Tag für 1:1-taugliche Bestandsübungen
insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from exercises e
join equipments eq on eq.slug = 'kettlebell'
where e.slug in (
  'dumbbell_swing', 'dumbbell_clean', 'dumbbell_snatch', 'dumbbell_rdl',
  'sl_romanian_deadlift', 'dumbbell_row', 'dumbbell_hip_hinge_row',
  'dumbbell_shoulder_press', 'dumbbell_floor_press', 'dumbbell_thruster',
  'dumbbell_step_up_to_press', 'dumbbell_goblet_reverse_lunge',
  'dumbbell_lateral_lunge', 'reverse_lunge', 'farmers_walk', 'suitcase_carry',
  'loaded_cossack_squat', 'loaded_deep_squat_hold', 'loaded_deep_lunge_rotation',
  'jefferson_curl'
)
  and not exists (
    select 1 from exercise_equipments ee
    where ee.exercise_id = e.id and ee.equipment_id = eq.id
  );

-- 2. Echte Lücken: Goblet Squat + Turkish Get-up
insert into exercises (name, slug, category_id, body_region, dominant_region, movement_pattern, min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, description_i18n)
select v.name, v.slug, c.id, v.body_region::body_region, v.dominant_region::body_region, v.movement_pattern::movement_pattern, v.min_level, v.max_level, v.intensity_score, 'dynamic', v.measurement_type, v.laterality::laterality, v.description_i18n::jsonb
from (values
  ('Goblet Squat', 'goblet_squat', 'strength', 'quad', null, 'legs', 5, 100, 5, 'reps', 'bilateral',
   '{"de": "Kettlebell oder Kurzhantel vor der Brust halten, aufrecht in die tiefe Kniebeuge sinken und kraftvoll aufstehen, Ellbogen innen an den Knien vorbei. Der beste Einstieg in beladene Kniebeugen — lehrt Tiefe und aufrechten Oberkörper.", "en": "Hold a kettlebell or dumbbell at your chest, sink into a deep squat staying upright and drive back up, elbows tracking inside the knees. The best entry into loaded squatting — teaches depth and an upright torso."}'),
  ('Turkish Get-up', 'turkish_get_up', 'strength', 'full_body', 'core', 'other', 30, 100, 6, 'reps', 'unilateral',
   '{"de": "Mit der Kettlebell über dem Kopf kontrolliert vom Liegen zum Stehen und wieder zurück — jede Position bewusst durchlaufen. Ganzkörper-Stabilität, Schultergesundheit und Rumpfkontrolle in einer Übung.", "en": "With a kettlebell locked out overhead, move from lying to standing and back under full control, owning every position. Full-body stability, shoulder health and core control in one exercise."}')
) as v(name, slug, category_slug, body_region, dominant_region, movement_pattern, min_level, max_level, intensity_score, measurement_type, laterality, description_i18n)
join categories c on c.slug = v.category_slug
where not exists (select 1 from exercises e where e.slug = v.slug);

-- Block-Tags: Goblet Squat trägt Hauptblöcke, TGU ist Ergänzung/komplementär
insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on (
     (e.slug = 'goblet_squat' and bt.slug in ('primary', 'secondary', 'accessory'))
  or (e.slug = 'turkish_get_up' and bt.slug in ('secondary', 'accessory'))
)
where e.slug in ('goblet_squat', 'turkish_get_up')
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

-- Equipment: Kettlebell ODER Kurzhantel (ANY-of)
insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from exercises e
join equipments eq on eq.slug in ('kettlebell', 'dumbbell')
where e.slug in ('goblet_squat', 'turkish_get_up')
  and not exists (
    select 1 from exercise_equipments ee
    where ee.exercise_id = e.id and ee.equipment_id = eq.id
  );

insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug in ('home', 'gym', 'outdoor')
where e.slug in ('goblet_squat', 'turkish_get_up')
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );
