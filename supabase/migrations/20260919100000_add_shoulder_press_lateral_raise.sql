-- Schulter-Basics (19.09.): Overhead Press (Barbell), Dumbbell Shoulder Press
-- und Dumbbell Lateral Raise existierten nur in der lokalen Dev-DB (dort einst
-- ohne Migration angelegt) — auf Prod fehlten sie komplett. Diese Migration
-- zieht sie mit den lokalen Attributen/Tags nach.
--
-- Ohne Video/Thumbnail (lokale Storage-Pfade sind nicht prod-portierbar,
-- werden nachgepflegt). Idempotent: lokal no-op, auf Prod legt sie die 3 an.

insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, image_group, description, description_i18n)
select v.name, v.slug, c.id, 'shoulder'::body_region, 'push'::movement_pattern, v.min_level, v.max_level, v.intensity_score, 'dynamic', 'reps_or_duration', 'bilateral'::laterality, 'upper_push'::exercise_image_group, v.description_i18n::jsonb ->> 'en', v.description_i18n::jsonb
from (values
  ('Overhead Press', 'overhead_press', 20, 100, 8,
   '{"de": "Striktes Drücken der Langhantel von der Schulter bis zur Streckung über dem Kopf. Das grundlegende vertikale Druckmuster für Schulterkraft.", "en": "Strict barbell press from shoulders to lockout overhead. The fundamental vertical push pattern for shoulder strength."}'),
  ('Dumbbell Shoulder Press', 'dumbbell_shoulder_press', 10, 100, 6,
   '{"de": "Schulterdrücken im Sitzen oder Stehen mit Kurzhanteln. Größerer Bewegungsumfang und unilaterale Balanceanforderung im Vergleich zur Langhantel.", "en": "Seated or standing dumbbell overhead press. Greater range of motion and unilateral balance demand compared to barbell."}'),
  ('Dumbbell Lateral Raise', 'dumbbell_lateral_raise', 1, 100, 4,
   '{"de": "Kurzhantel-Seitheben zur Isolation des mittleren Deltamuskels. Trainiert Schulterbreite und laterale Kraftproduktion.", "en": "Dumbbell lateral raise for medial deltoid isolation. Controls the shoulder width and lateral force production."}')
) as v(name, slug, min_level, max_level, intensity_score, description_i18n)
join categories c on c.slug = 'strength'
where not exists (select 1 from exercises e where e.slug = v.slug);

-- Block-Tags: Presses als Hauptreiz einsetzbar, Lateral Raise ohne primary-Rolle
insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on (
     (e.slug in ('overhead_press', 'dumbbell_shoulder_press') and bt.slug in ('primary', 'secondary', 'accessory'))
  or (e.slug = 'dumbbell_lateral_raise' and bt.slug in ('secondary', 'accessory'))
)
where e.slug in ('overhead_press', 'dumbbell_shoulder_press', 'dumbbell_lateral_raise')
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

-- Equipment: Barbell-Press braucht Rack, DB-Press ist auch mit Kettlebells machbar
insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from exercises e
join equipments eq on (
     (e.slug = 'overhead_press' and eq.slug in ('barbell', 'squat_rack'))
  or (e.slug = 'dumbbell_shoulder_press' and eq.slug in ('dumbbell', 'kettlebell'))
  or (e.slug = 'dumbbell_lateral_raise' and eq.slug = 'dumbbell')
)
where not exists (
    select 1 from exercise_equipments ee
    where ee.exercise_id = e.id and ee.equipment_id = eq.id
  );

-- Environments: Barbell gym-only, Hantel-Übungen auch home
insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on (
     (e.slug = 'overhead_press' and env.slug = 'gym')
  or (e.slug in ('dumbbell_shoulder_press', 'dumbbell_lateral_raise') and env.slug in ('gym', 'home'))
)
where e.slug in ('overhead_press', 'dumbbell_shoulder_press', 'dumbbell_lateral_raise')
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );
