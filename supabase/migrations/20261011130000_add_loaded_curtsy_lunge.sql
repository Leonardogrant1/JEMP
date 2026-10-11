-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Loaded Curtsy Lunge (QA 11.10.): Bodyweight ist für hohe Strength-Level kein
-- Reiz — leo2 (Strength 80) bekam die BW-Curtsy als Ebenen-Pick. Analog zur
-- Loaded Lateral Lunge; zusätzlich werden die BW-Varianten (curtsy_lunge,
-- lateral_lunge) bei Level 60 gedeckelt (etabliertes max_level-Muster, vgl.
-- negative_pull_up/chair_dip), damit starke Athleten die Loaded-Variante sehen.
-- Idempotent.

begin;
set local lock_timeout = '5s';

insert into exercises (name, slug, category_id, body_region, movement_pattern, strength_pattern,
  min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, movement_type,
  is_explosive, image_group, description_i18n)
select 'Loaded Curtsy Lunge', 'loaded_curtsy_lunge', c.id, 'glute', 'legs'::movement_pattern,
  'knee_dominant'::strength_pattern, 25, 100, 6, 'dynamic', 'reps',
  'unilateral'::laterality, 'transverse'::movement_type, false,
  'squat_patterns'::exercise_image_group,
  '{"de": "Curtsy Lunge mit Kurzhantel oder Kettlebell vor der Brust (Goblet): Ausfallschritt schräg hinter das Standbein, aufrecht bleiben, kontrolliert hochdrücken. Die Last macht Rotation und Adduktion der Hüfte progressiv belastbar — Stabilität für Schnitte und Drehungen unter echtem Gewicht.", "en": "Curtsy lunge holding a dumbbell or kettlebell at the chest (goblet): step diagonally behind the stance leg, stay tall, drive up under control. The load makes hip rotation and adduction progressively loadable — stability for cuts and turns under real weight."}'::jsonb
from categories c
where c.slug = 'strength'
  and not exists (select 1 from exercises e where e.slug = 'loaded_curtsy_lunge');

insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from exercises e
join equipments eq on eq.slug in ('dumbbell', 'kettlebell')
where e.slug = 'loaded_curtsy_lunge'
  and not exists (
    select 1 from exercise_equipments xe
    where xe.exercise_id = e.id and xe.equipment_id = eq.id
  );

insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug in ('gym', 'home')
where e.slug = 'loaded_curtsy_lunge'
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );

insert into exercise_regions (exercise_id, region, role)
select e.id, 'glute', 'primary'
from exercises e
where e.slug = 'loaded_curtsy_lunge'
  and not exists (
    select 1 from exercise_regions xr where xr.exercise_id = e.id and xr.role = 'primary'
  );

-- BW-Varianten deckeln: ab Level 60 übernehmen die Loaded-Varianten.
update exercises set max_level = 60
where slug in ('curtsy_lunge', 'lateral_lunge') and max_level > 60;

commit;
