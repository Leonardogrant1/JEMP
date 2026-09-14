-- Nacken-Kräftigung + Katalog-Fix (12.09.):
-- (a) Der Katalog hatte für `neck` nur Stretches (neck_circles,
--     upper_trap_stretch) — für Kampf-/Kontaktsport gehört Nacken-Kräftigung
--     zum Athletic Floor (Schlagabsorption, Clinch, Tackles). Drei
--     equipment-freie Übungen ergänzen, danach neck als Pflicht-Region für
--     combat_sports + rugby + football aktivieren.
-- (b) reactive_drop_catch braucht einen (Medizin-)Ball, war aber ohne
--     Equipment verknüpft — inkonsistent mit der med_ball-Familie; User ohne
--     Ball bekamen die Übung trotzdem.
--
-- Ohne Video/Thumbnail (werden nachgepflegt). Idempotent, prod-portierbar.

insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, description_i18n)
select v.name, v.slug, c.id, v.body_region::body_region, v.movement_pattern::movement_pattern, v.min_level, v.max_level, v.intensity_score, 'dynamic', v.measurement_type, v.laterality::laterality, v.description_i18n::jsonb
from (values
  ('Supine Neck Flexion', 'supine_neck_flexion', 'strength', 'neck', 'other', 1, 70, 2, 'reps', 'bilateral',
   '{"de": "In Rückenlage das Kinn leicht einziehen und den Kopf kontrolliert wenige Zentimeter anheben, kurz halten, langsam ablegen. Kräftigt die vordere Halsmuskulatur — Basis für Schlagabsorption und Kopfkontrolle.", "en": "Lying on your back, tuck the chin slightly and lift the head a few centimeters under control, pause, lower slowly. Strengthens the front of the neck — the base for absorbing impact and controlling head position."}'),
  ('Prone Neck Extension', 'prone_neck_extension', 'strength', 'neck', 'other', 1, 70, 2, 'reps', 'bilateral',
   '{"de": "In Bauchlage mit dem Kopf über der Kante (Bett, Bank) den Kopf kontrolliert heben, bis Nacken und Rücken eine Linie bilden, kurz halten, langsam senken. Kräftigt die hintere Halsmuskulatur.", "en": "Lying face down with your head off an edge (bed, bench), lift the head under control until neck and back form one line, pause, lower slowly. Strengthens the back of the neck."}'),
  ('Four-Way Neck Isometrics', 'four_way_neck_isometrics', 'strength', 'neck', 'isometric', 5, 100, 3, 'duration', 'bilateral',
   '{"de": "Handfläche gegen Stirn, Hinterkopf und beide Schläfen drücken — der Kopf hält dagegen, ohne sich zu bewegen. Jede Richtung halten. Der Klassiker für einen belastbaren Nacken im Kampf- und Kontaktsport.", "en": "Press your palm against your forehead, the back of your head and both temples — the head resists without moving. Hold each direction. The classic for a resilient neck in combat and contact sports."}')
) as v(name, slug, category_slug, body_region, movement_pattern, min_level, max_level, intensity_score, measurement_type, laterality, description_i18n)
join categories c on c.slug = v.category_slug
where not exists (select 1 from exercises e where e.slug = v.slug);

-- Reine Accessory-Rolle (Prävention, kein Hauptreiz)
insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug = 'accessory'
where e.slug in ('supine_neck_flexion', 'prone_neck_extension', 'four_way_neck_isometrics')
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

-- Equipment-frei, überall machbar
insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug in ('home', 'gym', 'outdoor')
where e.slug in ('supine_neck_flexion', 'prone_neck_extension', 'four_way_neck_isometrics')
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );

-- neck als Pflicht-Region für Kontakt-/Kampfsport (Katalog kann es jetzt tragen)
insert into sport_required_regions (sport_id, body_region)
select s.id, 'neck'::body_region
from sports s
where s.slug in ('boxing', 'kickboxing', 'mma', 'karate', 'taekwondo', 'bjj', 'judo', 'wrestling', 'rugby', 'football')
  and not exists (
    select 1 from sport_required_regions x
    where x.sport_id = s.id and x.body_region = 'neck'::body_region
  );

-- reactive_drop_catch: Ball nötig → medicine_ball verknüpfen
insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from exercises e
join equipments eq on eq.slug = 'medicine_ball'
where e.slug = 'reactive_drop_catch'
  and not exists (
    select 1 from exercise_equipments ee
    where ee.exercise_id = e.id and ee.equipment_id = eq.id
  );
