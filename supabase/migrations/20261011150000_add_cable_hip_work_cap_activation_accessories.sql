-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Accessory-Progression für starke Athleten (QA 11.10.): Kabel-Adduktion/
-- -Abduktion neu (progressiv ladbar, Gym), und die Activation-Varianten
-- (calf_raise_bilateral, standing_banded_hip_adduction, standing_hip_abduction,
-- fire_hydrant) bei Level 50 gedeckelt — darüber übernehmen die geladenen bzw.
-- harten Varianten (barbell/seated/single_leg calf raise, copenhagen, Kabel).
-- Fuß-/Schienbein-Prophylaxe (heel/toe walk, short foot, tibialis) bleibt
-- bewusst ungedeckelt. max_level-Muster wie banded_hip_thrust. Idempotent.

begin;
set local lock_timeout = '5s';

insert into exercises (name, slug, category_id, body_region, movement_pattern,
  min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, movement_type,
  is_explosive, image_group, description_i18n)
select v.name, v.slug, c.id, v.region::body_region, 'legs'::movement_pattern,
  20, 100, 5, 'dynamic', 'reps', 'unilateral'::laterality, 'frontal'::movement_type,
  false, 'hip_thrust'::exercise_image_group, v.descr::jsonb
from (values
  ('Cable Hip Adduction', 'cable_hip_adduction', 'groin',
   '{"de": "Kabel tief eingestellt, Schlaufe am inneren Knöchel: das Bein kontrolliert vor dem Standbein zur Mitte führen und langsam zurück. Adduktoren-Kraft unter echter, steigerbarer Last — der Schutz der Leiste bei Richtungswechseln.", "en": "Cable set low, strap on the inside ankle: pull the leg across in front of the stance leg and return slowly. Adductor strength under real, progressive load — groin protection for change of direction."}'),
  ('Cable Hip Abduction', 'cable_hip_abduction', 'hip',
   '{"de": "Kabel tief eingestellt, Schlaufe am äußeren Knöchel: das Bein kontrolliert seitlich vom Standbein wegführen und langsam zurück. Glute med unter steigerbarer Last — Beckenstabilität für Landungen und seitliche Abdrücke.", "en": "Cable set low, strap on the outside ankle: drive the leg away from the stance leg under control and return slowly. Glute med under progressive load — pelvic stability for landings and lateral push-offs."}')
) as v(name, slug, region, descr)
join categories c on c.slug = 'strength'
where not exists (select 1 from exercises e where e.slug = v.slug);

insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from exercises e
join equipments eq on eq.slug = 'cable_machine'
where e.slug in ('cable_hip_adduction', 'cable_hip_abduction')
  and not exists (
    select 1 from exercise_equipments xe
    where xe.exercise_id = e.id and xe.equipment_id = eq.id
  );

insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug = 'gym'
where e.slug in ('cable_hip_adduction', 'cable_hip_abduction')
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );

insert into exercise_regions (exercise_id, region, role)
select e.id, e.body_region, 'primary'
from exercises e
where e.slug in ('cable_hip_adduction', 'cable_hip_abduction')
  and not exists (
    select 1 from exercise_regions xr where xr.exercise_id = e.id and xr.role = 'primary'
  );

-- Activation-Varianten deckeln: ab Level 50 übernehmen geladene/harte Varianten
-- (Waden: barbell/seated/single_leg; Adduktion: copenhagen + Kabel; Abduktion: Kabel).
update exercises set max_level = 50
where slug in ('calf_raise_bilateral', 'standing_banded_hip_adduction', 'standing_hip_abduction', 'fire_hydrant')
  and max_level > 50;

commit;
