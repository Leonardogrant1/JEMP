-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Speed-Warmup-Bausteine (Coaching-Template 09.10.): Die Sprint-Einheit rahmt
-- sich mit lockerem Traben (Warmup-Einstieg + Auslaufen) und schließt die
-- Warmup-Rampe mit Steigerungsläufen ab (70% → 90%). Beide Slugs sind Anker
-- im deterministischen Builder (build-speed-session.ts). Ohne Video/Thumbnail
-- (werden nachgepflegt). Idempotent.

insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, image_group, movement_type, is_explosive, description_i18n)
select 'Easy Jog', 'easy_jog', c.id, 'full_body', 'cardio', 1, 100, 2, 'dynamic', 'duration', 'bilateral', 'sprints', 'sagittal', false,
  '{"de": "Lockeres Traben in einem Tempo, bei dem du dich problemlos unterhalten könntest. Als Einstieg bringt es Kreislauf und Muskulatur auf Temperatur, als Auslaufen nach der Belastung normalisiert es den Puls.", "en": "Easy jogging at a pace where you could comfortably hold a conversation. As a warm-up it raises circulation and muscle temperature; as a cool-down it brings your heart rate back to normal."}'::jsonb
from categories c
where c.slug = 'sprints'
  and not exists (select 1 from exercises e where e.slug = 'easy_jog');

insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, image_group, movement_type, is_explosive, description_i18n)
select 'Steigerungslauf', 'build_up_run', c.id, 'full_body', 'cardio', 1, 100, 5, 'dynamic', 'distance', 'bilateral', 'sprints', 'sagittal', false,
  '{"de": "Über 30 m gleichmäßig von ca. 70% auf 90% Tempo steigern, locker austrudeln lassen. Die Brücke zwischen Aufwärmen und maximalem Sprinten — nie aus dem kalten Zustand voll beschleunigen.", "en": "Build up smoothly from ~70% to 90% speed over 30 m, then coast out. The bridge between warming up and maximal sprinting — never accelerate fully from cold."}'::jsonb
from categories c
where c.slug = 'sprints'
  and not exists (select 1 from exercises e where e.slug = 'build_up_run');

-- Block-Tags: Traben rahmt (warmup + cooldown), Steigerungslauf nur warmup.
insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug in ('warmup', 'cooldown')
where e.slug = 'easy_jog'
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug = 'warmup'
where e.slug = 'build_up_run'
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

-- Umgebungen: Traben geht überall, Steigerungsläufe brauchen 30 m freie Bahn.
insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug in ('gym', 'home', 'outdoor')
where e.slug = 'easy_jog'
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );

insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug = 'outdoor'
where e.slug = 'build_up_run'
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );
