-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Loaded Single-Leg Calf Raise (QA 11.10.): einbeinig BW ist härter als
-- bilateral, aber für hohe Strength-Level trotzdem nur Volumen — die geladene
-- Variante macht die Wade progressiv belastbar. BW-Variante bei 60 gedeckelt
-- (einbeinig verdient mehr Spielraum als die bilaterale 50). Idempotent.

begin;
set local lock_timeout = '5s';

insert into exercises (name, slug, category_id, body_region, movement_pattern,
  min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, movement_type,
  is_explosive, image_group, description_i18n)
select 'Dumbbell Single-Leg Calf Raise', 'dumbbell_single_leg_calf_raise', c.id, 'calf', 'legs'::movement_pattern,
  25, 100, 5, 'dynamic', 'reps', 'unilateral'::laterality, 'sagittal'::movement_type,
  -- image_group 'mobility' wie seated/barbell_standing_calf_raise — 'calf_ankle'
  -- hat kein Bild im App-Mapping (GROUP_IMAGES).
  false, 'mobility'::exercise_image_group,
  '{"de": "Einbeinig auf einer Stufe, Kurzhantel auf der Arbeitsseite, freie Hand hält Balance: Ferse tief absenken, maximal hochdrücken, oben kurz halten. Einbeinige Wadenkraft unter steigerbarer Last — Abdruck und Landungssteifigkeit pro Bein.", "en": "Single leg on a step, dumbbell on the working side, free hand for balance: lower the heel deep, drive up fully, pause at the top. Single-leg calf strength under progressive load — push-off and landing stiffness per leg."}'::jsonb
from categories c
where c.slug = 'strength'
  and not exists (select 1 from exercises e where e.slug = 'dumbbell_single_leg_calf_raise');

insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from exercises e
join equipments eq on eq.slug in ('dumbbell', 'kettlebell')
where e.slug = 'dumbbell_single_leg_calf_raise'
  and not exists (
    select 1 from exercise_equipments xe
    where xe.exercise_id = e.id and xe.equipment_id = eq.id
  );

insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug in ('gym', 'home')
where e.slug = 'dumbbell_single_leg_calf_raise'
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );

insert into exercise_regions (exercise_id, region, role)
select e.id, 'calf', 'primary'
from exercises e
where e.slug = 'dumbbell_single_leg_calf_raise'
  and not exists (
    select 1 from exercise_regions xr where xr.exercise_id = e.id and xr.role = 'primary'
  );

update exercises set max_level = 60
where slug = 'single_leg_calf_raise' and max_level > 60;

commit;
