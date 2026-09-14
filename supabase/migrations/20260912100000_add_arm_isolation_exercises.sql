-- Arm-Isolationsübungen (12.09.): Der Katalog hatte 0 bicep- und nur 2 echte
-- tricep-Übungen — der neue ARM-FOKUS-accessory-Block des Generators (bei
-- Fokus-Priorität 1 = strength) braucht tragfähige Pools für bicep/tricep in
-- gym UND home/outdoor (Band-Varianten).
--
-- Ohne Video/Thumbnail (werden nachgepflegt). Idempotent, prod-portierbar.

insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, description_i18n)
select v.name, v.slug, c.id, v.body_region::body_region, v.movement_pattern::movement_pattern, v.min_level, v.max_level, v.intensity_score, 'dynamic', 'reps', v.laterality::laterality, v.description_i18n::jsonb
from (values
  ('Dumbbell Biceps Curl', 'dumbbell_biceps_curl', 'strength', 'bicep', 'pull', 1, 100, 4, 'bilateral',
   '{"de": "Kurzhanteln mit supinierten Handgelenken kontrolliert Richtung Schulter curlen, Ellbogen bleiben am Körper, langsam absenken. Der Klassiker für gezielten Bizepsaufbau.", "en": "Curl dumbbells toward the shoulders with supinated wrists, elbows pinned to your sides, lower slowly. The classic movement for direct biceps growth."}'),
  ('Hammer Curl', 'hammer_curl', 'strength', 'bicep', 'pull', 5, 100, 4, 'bilateral',
   '{"de": "Kurzhanteln im neutralen Griff (Daumen nach oben) curlen, Ellbogen fixiert, kontrolliert absenken. Trifft Bizeps und Unterarm — dickerer Armumfang durch den Brachialis.", "en": "Curl dumbbells with a neutral grip (thumbs up), elbows fixed, lower under control. Hits biceps and forearm — thicker arms through the brachialis."}'),
  ('Barbell Biceps Curl', 'barbell_biceps_curl', 'strength', 'bicep', 'pull', 10, 100, 5, 'bilateral',
   '{"de": "Langhantel schulterbreit greifen und ohne Schwung Richtung Brust curlen, Oberkörper bleibt stabil, langsam absenken. Die schwerste Curl-Variante für maximalen Bizepsreiz.", "en": "Grip a barbell shoulder-width and curl it toward the chest without momentum, torso stays still, lower slowly. The heaviest curl variation for maximal biceps stimulus."}'),
  ('Banded Biceps Curl', 'banded_biceps_curl', 'strength', 'bicep', 'pull', 1, 60, 3, 'bilateral',
   '{"de": "Auf das Band stellen, Griffe mit supinierten Handgelenken Richtung Schulter curlen, gegen den Bandzug langsam absenken. Bizeps-Isolation für unterwegs und zuhause.", "en": "Stand on the band and curl the handles toward your shoulders with supinated wrists, lower slowly against the band tension. Biceps isolation for home and on the go."}'),
  ('Cable Triceps Pushdown', 'cable_triceps_pushdown', 'strength', 'tricep', 'push', 5, 100, 4, 'bilateral',
   '{"de": "Am hohen Kabelzug die Ellbogen am Körper fixieren und das Griffstück kontrolliert nach unten strecken, oben langsam nachgeben. Konstante Spannung für gezielten Trizepsaufbau.", "en": "At a high cable, pin your elbows to your sides and press the attachment down under control, yield slowly on the way up. Constant tension for direct triceps growth."}'),
  ('Overhead Dumbbell Triceps Extension', 'overhead_dumbbell_triceps_extension', 'strength', 'tricep', 'push', 5, 100, 4, 'bilateral',
   '{"de": "Eine Kurzhantel beidhändig über dem Kopf halten, Unterarme hinter den Kopf absenken und kraftvoll nach oben strecken, Ellbogen zeigen nach vorn. Trifft den langen Trizepskopf in voller Dehnung.", "en": "Hold one dumbbell overhead with both hands, lower the forearms behind your head and extend powerfully, elbows pointing forward. Hits the long head of the triceps at full stretch."}'),
  ('Skull Crusher', 'skull_crusher', 'strength', 'tricep', 'push', 15, 100, 5, 'bilateral',
   '{"de": "In Rückenlage die Langhantel über der Brust halten und nur aus den Ellbogen kontrolliert Richtung Stirn absenken, dann kraftvoll strecken. Der Volumen-Klassiker für den Trizeps.", "en": "Lying on your back, hold a barbell over the chest and lower it toward your forehead bending only at the elbows, then extend powerfully. The classic volume builder for triceps."}'),
  ('Banded Triceps Extension', 'banded_triceps_extension', 'strength', 'tricep', 'push', 1, 60, 3, 'bilateral',
   '{"de": "Band oben fixieren oder hinter dem Rücken führen, Ellbogen fixiert, Arme gegen den Bandzug kontrolliert strecken und langsam zurückführen. Trizeps-Isolation ohne Geräte-Bedarf.", "en": "Anchor the band overhead or behind your back, elbows fixed, extend the arms against the band tension and return slowly. Triceps isolation with no machines required."}')
) as v(name, slug, category_slug, body_region, movement_pattern, min_level, max_level, intensity_score, laterality, description_i18n)
join categories c on c.slug = v.category_slug
where not exists (select 1 from exercises e where e.slug = v.slug);

-- Block-Tags: reine Accessory-Rolle (Isolationsübungen — kein Hauptreiz)
insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug = 'accessory'
where e.slug in ('dumbbell_biceps_curl', 'hammer_curl', 'barbell_biceps_curl', 'banded_biceps_curl',
                 'cable_triceps_pushdown', 'overhead_dumbbell_triceps_extension', 'skull_crusher', 'banded_triceps_extension')
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

-- Equipment (Konvention wie landmine_press: nur das tragende Gerät verknüpfen)
insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from exercises e
join equipments eq on (
     (e.slug in ('dumbbell_biceps_curl', 'hammer_curl', 'overhead_dumbbell_triceps_extension') and eq.slug = 'dumbbell')
  or (e.slug in ('barbell_biceps_curl', 'skull_crusher') and eq.slug = 'barbell')
  or (e.slug = 'cable_triceps_pushdown' and eq.slug = 'cable_machine')
  or (e.slug in ('banded_biceps_curl', 'banded_triceps_extension') and eq.slug = 'resistance_band')
)
where not exists (
    select 1 from exercise_equipments ee
    where ee.exercise_id = e.id and ee.equipment_id = eq.id
  );

-- Environments: Hantel-/Band-Übungen überall, Cable/Barbell-Übungen gym-only
insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on (
     (e.slug in ('dumbbell_biceps_curl', 'hammer_curl', 'overhead_dumbbell_triceps_extension', 'banded_biceps_curl', 'banded_triceps_extension') and env.slug in ('home', 'gym', 'outdoor'))
  or (e.slug in ('barbell_biceps_curl', 'skull_crusher', 'cable_triceps_pushdown') and env.slug = 'gym')
)
where not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );
