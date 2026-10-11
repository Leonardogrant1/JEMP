-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Standing Calf Raise mit Last (QA 10.10.): Gastrocnemius-Pendant zur Seated
-- Calf Raise — Langhantel im Rack oder geführte Stange (Multipresse).
-- Equipment-Filter ist any-match: barbell ODER squat_rack genügt. Idempotent.

begin;
set local lock_timeout = '5s';

insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level,
  intensity_score, exercise_type, measurement_type, laterality, movement_type, is_explosive, image_group, description_i18n)
select 'Standing Calf Raise', 'barbell_standing_calf_raise', c.id, 'calf', 'legs'::movement_pattern, 1, 100,
  5, 'dynamic', 'reps_or_duration', 'bilateral'::laterality, 'sagittal'::movement_type, false, 'mobility',
  '{"de": "Langhantel im Nacken (im Rack oder an der geführten Stange/Multipresse): Fersen maximal heben, oben kurz halten, langsam ablassen. Gestrecktes Knie = voller Gastrocnemius-Reiz für Abdruck und Absprung.", "en": "Barbell on the back (in the rack or on a guided bar/Smith machine): raise the heels fully, pause at the top, lower slowly. Straight knees = full gastrocnemius stimulus for push-off and takeoff."}'::jsonb
from categories c
where c.slug = 'strength'
  and not exists (select 1 from exercises e where e.slug = 'barbell_standing_calf_raise');

insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from exercises e
join equipments eq on eq.slug in ('barbell', 'squat_rack')
where e.slug = 'barbell_standing_calf_raise'
  and not exists (
    select 1 from exercise_equipments xe
    where xe.exercise_id = e.id and xe.equipment_id = eq.id
  );

insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug in ('gym', 'home')
where e.slug = 'barbell_standing_calf_raise'
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );

insert into exercise_regions (exercise_id, region, role)
select e.id, 'calf', 'primary'
from exercises e
where e.slug = 'barbell_standing_calf_raise'
  and not exists (
    select 1 from exercise_regions xr where xr.exercise_id = e.id and xr.role = 'primary'
  );

commit;
