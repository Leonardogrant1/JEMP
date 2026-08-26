-- Warmup-/Cooldown-Katalog-Lücken schließen (Befund 26.08.): chest hatte 0
-- Warmups (Push-Tage wärmten mit Hüft-Übungen auf), upper_back-Warmups gab es
-- nur mit Band/Stange, Cooldowns für core/hamstring(ohne Rolle)/tricep fehlten.
-- Duplikat-Check gelaufen: childs_pose existiert bereits (thoracic),
-- figure_four ≈ seated_piriformis_stretch — beide bewusst NICHT neu angelegt.
--
-- 5 Warmups (dynamic) + 4 Cooldowns (restorative), alle equipment-frei,
-- alle Environments, Level 1–100 (Warmup/Cooldown wird nicht level-gegatet).
-- Ohne Video/Thumbnail (werden nachgepflegt). Idempotent, prod-portierbar.

-- ── Warmups ──────────────────────────────────────────────────────────────────
insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, is_unilateral, description_i18n)
select v.name, v.slug, c.id, v.body_region::body_region, v.movement_pattern::movement_pattern, 1, 100, v.intensity_score, 'dynamic', 'reps_or_duration', 'bilateral', false, v.description_i18n::jsonb
from (values
  ('Scapular Push-up', 'scap_push_up', 'mobility', 'chest', 'push', 3,
   '{"de": "Im Stütz die Schulterblätter aktiv zusammenziehen und auseinanderdrücken, Arme bleiben gestreckt. Aktiviert Serratus und Schulterblatt-Kontrolle vor Druckübungen.", "en": "In a plank position, actively squeeze and spread the shoulder blades while keeping the arms straight. Activates the serratus and scapular control before pressing work."}'),
  ('Dynamic Arm Swings', 'dynamic_arm_swings', 'mobility', 'chest', 'mobility', 2,
   '{"de": "Arme auf Schulterhöhe dynamisch öffnen und vor der Brust überkreuzen, Tempo langsam steigern. Durchblutet Brust und Schultern vor dem Drücken.", "en": "Dynamically swing the arms open at shoulder height and cross them in front of the chest, gradually increasing the tempo. Warms up chest and shoulders before pressing."}'),
  ('Wall Slide', 'wall_slide', 'mobility', 'upper_back', 'mobility', 2,
   '{"de": "Rücken an der Wand, Unterarme in U-Position anlegen und langsam nach oben gleiten, Kontakt halten. Mobilisiert Schulterblätter und oberen Rücken.", "en": "Back against the wall, forearms in a goalpost position, slide the arms up slowly while keeping contact. Mobilises the shoulder blades and upper back."}'),
  ('Prone Y-T-W Raise', 'prone_ytw_raise', 'mobility', 'upper_back', 'pull', 3,
   '{"de": "In Bauchlage die Arme nacheinander in Y-, T- und W-Position anheben und kurz halten. Aktiviert oberen Rücken und hintere Schulter ohne Equipment.", "en": "Lying face down, raise the arms into Y, T and W positions one after another, pausing briefly. Activates the upper back and rear shoulders without equipment."}'),
  ('Glute Bridge', 'glute_bridge', 'strength', 'glute', 'legs', 3,
   '{"de": "Rückenlage, Füße aufgestellt: Hüfte anheben, Gesäß oben bewusst anspannen und kontrolliert absenken. Der Grundstein der Glute-Aktivierung.", "en": "Lying on your back with feet planted: lift the hips, squeeze the glutes at the top and lower under control. The foundation of glute activation."}')
) as v(name, slug, category_slug, body_region, movement_pattern, intensity_score, description_i18n)
join categories c on c.slug = v.category_slug
where not exists (select 1 from exercises e where e.slug = v.slug);

-- ── Cooldowns ────────────────────────────────────────────────────────────────
insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, is_unilateral, description_i18n)
select v.name, v.slug, c.id, v.body_region::body_region, 'mobility', 1, 100, 1, 'restorative', 'duration', v.laterality::laterality, v.is_unilateral, v.description_i18n::jsonb
from (values
  ('Cobra Stretch', 'cobra_stretch', 'core', 'bilateral', false,
   '{"de": "Aus der Bauchlage den Oberkörper aufstützen, Hüfte bleibt am Boden, Bauch lang machen und ruhig atmen. Dehnt Bauchmuskulatur und Hüftbeuger.", "en": "From lying face down, prop up the torso while the hips stay on the floor, lengthen the abs and breathe calmly. Stretches the abdominals and hip flexors."}'),
  ('Seated Forward Fold', 'seated_forward_fold', 'hamstring', 'bilateral', false,
   '{"de": "Im Langsitz mit langem Rücken nach vorne beugen, bis die Dehnung in der Beinrückseite ankommt, Position ruhig halten. Der Hamstring-Klassiker ohne Hilfsmittel.", "en": "Seated with legs extended, hinge forward with a long spine until you feel the stretch in the hamstrings, then hold calmly. The classic no-equipment hamstring stretch."}'),
  ('Cross-Body Shoulder Stretch', 'cross_body_shoulder_stretch', 'shoulder', 'unilateral', true,
   '{"de": "Einen Arm auf Schulterhöhe vor den Körper ziehen und mit dem anderen sanft heranziehen. Dehnt hintere Schulter und Kapsel nach Druck- und Wurftagen.", "en": "Pull one arm across the body at shoulder height and gently draw it closer with the other arm. Stretches the rear shoulder and capsule after pressing or throwing days."}'),
  ('Overhead Triceps Stretch', 'overhead_triceps_stretch', 'tricep', 'unilateral', true,
   '{"de": "Einen Arm über den Kopf führen, Hand zwischen die Schulterblätter, mit der anderen Hand den Ellbogen sanft nachdrücken. Dehnt Trizeps und Lat.", "en": "Reach one arm overhead with the hand between the shoulder blades and gently press the elbow with the other hand. Stretches the triceps and lats."}')
) as v(name, slug, body_region, laterality, is_unilateral, description_i18n)
join categories c on c.slug = 'mobility'
where not exists (select 1 from exercises e where e.slug = v.slug);

-- ── Block-Tags ───────────────────────────────────────────────────────────────
insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug = 'warmup'
where e.slug in ('scap_push_up', 'dynamic_arm_swings', 'wall_slide', 'prone_ytw_raise', 'glute_bridge')
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug = 'accessory'
where e.slug = 'glute_bridge'
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug = 'cooldown'
where e.slug in ('cobra_stretch', 'seated_forward_fold', 'cross_body_shoulder_stretch', 'overhead_triceps_stretch')
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

-- ── Environments: überall ────────────────────────────────────────────────────
insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug in ('home', 'gym', 'outdoor')
where e.slug in (
    'scap_push_up', 'dynamic_arm_swings', 'wall_slide', 'prone_ytw_raise', 'glute_bridge',
    'cobra_stretch', 'seated_forward_fold', 'cross_body_shoulder_stretch', 'overhead_triceps_stretch'
  )
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );
