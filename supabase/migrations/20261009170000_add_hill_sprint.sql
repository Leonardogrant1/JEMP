-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Hill Sprint (Sprint-Env-Fix 09.10.): Bergsprint als Beschleunigungs-Variante
-- neben stair_sprint — hohe Kraftkomponente bei geringer Aufprall-Last, der
-- Klassiker für Kampfsportler und als Winter-/Hügel-Alternative zum Flachsprint.
-- Outdoor, ohne Equipment. Ohne Video/Thumbnail (werden nachgepflegt). Idempotent.

insert into exercises (name, slug, category_id, body_region, movement_pattern, sprint_type, min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, image_group, movement_type, is_explosive, description_i18n)
select 'Hill Sprint', 'hill_sprint', c.id, 'full_body', 'cardio', 'acceleration', 1, 100, 8, 'dynamic', 'distance', 'bilateral', 'sprints', 'sagittal', true,
  '{"de": "Einen Hügel mit maximaler Absicht hinaufsprinten (15–30 m, spürbare Steigung), locker zurückgehen. Die Steigung erzwingt Vorlage und kraftvolle Bodenkontakte — maximaler Antritts-Reiz bei geringer Aufprall-Last.", "en": "Sprint up a hill with maximal intent (15–30 m, noticeable incline), walk back down. The incline forces forward lean and powerful ground contacts — a maximal acceleration stimulus with low impact load."}'::jsonb
from categories c
where c.slug = 'sprints'
  and not exists (select 1 from exercises e where e.slug = 'hill_sprint');

insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug = 'outdoor'
where e.slug = 'hill_sprint'
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );
