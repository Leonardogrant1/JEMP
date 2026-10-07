-- Dumbbell Bulgarian Split Squat (26.09.): Die Barbell-Version ist gym-only —
-- die gängigere Kurzhantel-Ausführung fehlte komplett. Eigene Übung (statt
-- Cross-Tagging), da Beschreibung/Video/Intensität sich unterscheiden.
-- Kettlebell-Tag nach Cross-Tagging-Konvention (1:1 mit KB ausführbar).
-- Ohne Video/Thumbnail (werden nachgepflegt). Idempotent, prod-portierbar.

insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, image_group, description_i18n)
select 'Dumbbell Bulgarian Split Squat', 'dumbbell_bulgarian_split_squat', c.id, 'quad', 'legs', 10, 100, 6, 'dynamic', 'reps', 'unilateral', 'squat_patterns',
  '{"de": "Einbeinige Kniebeuge mit erhöhtem hinteren Fuß, Kurzhanteln hängen seitlich neben dem Körper. Zugänglicher als die Langhantel-Version und leichter zu skalieren — hohe Anforderungen an Quadrizeps, Gesäß und Balance.", "en": "Rear foot elevated single leg squat holding dumbbells at your sides. More accessible than the barbell version and easier to scale — high demand on quads, glutes and balance."}'::jsonb
from categories c
where c.slug = 'strength'
  and not exists (select 1 from exercises e where e.slug = 'dumbbell_bulgarian_split_squat');

insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug in ('primary', 'secondary', 'accessory')
where e.slug = 'dumbbell_bulgarian_split_squat'
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );

-- Equipment analog zur Barbell-Version (Träger-Gerät + bench für die Erhöhung)
insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from exercises e
join equipments eq on eq.slug in ('dumbbell', 'kettlebell', 'bench')
where e.slug = 'dumbbell_bulgarian_split_squat'
  and not exists (
    select 1 from exercise_equipments ee
    where ee.exercise_id = e.id and ee.equipment_id = eq.id
  );

insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on env.slug in ('gym', 'home')
where e.slug = 'dumbbell_bulgarian_split_squat'
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );
