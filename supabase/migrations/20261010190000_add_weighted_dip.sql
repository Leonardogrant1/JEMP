-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Weighted Dip (QA 10.10.): erste schwere Option für push_vertical nach unten.
-- Bodyweight-Dips (Intensität 6) verlieren den Heavy-Slot strukturell immer
-- gegen Push Press/OHP — mit Zusatzlast konkurriert das Muster auf Augenhöhe.
-- Equipment-Konvention wie 'dips': dip_bar + weight_belt (Filter ist any-match).
-- Idempotent, ohne Video/Thumbnail (nachpflegen).

begin;
set local lock_timeout = '5s';

insert into exercises (name, slug, category_id, body_region, movement_pattern, strength_pattern, min_level, max_level,
  intensity_score, exercise_type, measurement_type, laterality, image_group, movement_type, is_explosive, description_i18n)
select 'Weighted Dip', 'weighted_dip', c.id, 'tricep', 'push'::movement_pattern, 'push_vertical', 40, 100,
  8, 'dynamic', 'reps', 'bilateral'::laterality, 'upper_push'::exercise_image_group, 'sagittal'::movement_type, false,
  '{"de": "Dips mit Zusatzgewicht am Gürtel: kontrolliert tief, kraftvoll hochdrücken, Ellbogen nah am Körper. Das schwere Gegenstück zum Überkopfdrücken — vertikaler Druck nach unten.", "en": "Dips with added weight on a belt: controlled depth, drive up powerfully, elbows close to the body. The heavy counterpart to overhead pressing — vertical push downward."}'::jsonb
from categories c
where c.slug = 'strength'
  and not exists (select 1 from exercises e where e.slug = 'weighted_dip');

insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from exercises e
join equipments eq on eq.slug in ('dip_bar', 'weight_belt')
where e.slug = 'weighted_dip'
  and not exists (
    select 1 from exercise_equipments xe
    where xe.exercise_id = e.id and xe.equipment_id = eq.id
  );

insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug in ('gym', 'home', 'outdoor')
where e.slug = 'weighted_dip'
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );

insert into exercise_regions (exercise_id, region, role)
select e.id, 'tricep', 'primary'
from exercises e
where e.slug = 'weighted_dip'
  and not exists (
    select 1 from exercise_regions xr where xr.exercise_id = e.id and xr.role = 'primary'
  );

commit;
