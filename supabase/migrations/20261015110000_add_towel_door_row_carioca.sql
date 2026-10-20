-- Bodyweight-Pool-Lücken (Env-Cases-QA 15.10.): pull_horizontal hatte ohne
-- Equipment nur table_inverted_row, cod nur lateral_shuffle. Zwei Übungen
-- ohne Equipment-Anforderung dazu. towel_door_row ist bewusst HOME-only
-- (braucht eine Tür); Carioca läuft überall. Ohne Video/Thumbnail (werden
-- im Admin nachgepflegt). Idempotent.

begin;
set local lock_timeout = '5s';

insert into exercises (name, slug, category_id, body_region, dominant_region, movement_pattern,
  min_level, max_level, intensity_score, exercise_type, measurement_type, laterality,
  image_group, movement_type, is_explosive, strength_pattern, description_i18n)
select v.name, v.slug, c.id, v.body_region::body_region, nullif(v.dominant_region, '')::body_region, v.movement_pattern::movement_pattern,
  v.min_level, v.max_level, v.intensity_score, v.exercise_type, v.measurement_type, v.laterality::laterality,
  v.image_group::exercise_image_group, v.movement_type::movement_type, false, nullif(v.strength_pattern, '')::strength_pattern, v.descr::jsonb
from (values
  ('Towel Door Row', 'towel_door_row', 'strength', 'upper_back', '', 'pull',
    1, 50, 4, 'dynamic', 'reps', 'bilateral', 'upper_pull', 'sagittal', 'pull_horizontal',
    '{"de": "Handtuch um eine stabile Türklinke legen, zurücklehnen und den Körper zur Tür ziehen. Je steiler der Winkel, desto schwerer — der horizontale Zug für Zuhause ganz ohne Geräte.", "en": "Loop a towel around a sturdy door handle, lean back and pull your chest toward the door. The steeper the angle, the harder — a horizontal pull for home with zero equipment."}'),
  ('Carioca', 'carioca', 'cod', 'full_body', 'hip', 'cardio',
    1, 100, 4, 'dynamic', 'duration', 'alternating', 'agility', 'frontal', '',
    '{"de": "Seitliches Überkreuzlaufen: ein Fuß kreuzt abwechselnd vor und hinter dem Standbein, die Hüfte rotiert mit. Klassiker für laterale Beweglichkeit und Fußarbeit — ohne jedes Hilfsmittel.", "en": "Lateral crossover running: one foot alternately crosses in front of and behind the other while the hips rotate. A classic for lateral quickness and footwork — no equipment needed."}')
) as v(name, slug, category, body_region, dominant_region, movement_pattern,
  min_level, max_level, intensity_score, exercise_type, measurement_type, laterality,
  image_group, movement_type, strength_pattern, descr)
join categories c on c.slug = v.category
where not exists (select 1 from exercises e where e.slug = v.slug);

-- Environments: Towel Row nur home, Carioca überall
insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id from exercises e join environments env
  on (e.slug = 'towel_door_row' and env.slug = 'home')
  or (e.slug = 'carioca' and env.slug in ('gym', 'home', 'outdoor'))
where not exists (
  select 1 from exercise_environments l where l.exercise_id = e.id and l.environment_id = env.id
);

-- Legacy-Block-Tags: Row wie table_inverted_row (primary/secondary),
-- Carioca wie lateral_shuffle (warmup-tauglicher Drill)
insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id from exercises e join block_types bt
  on (e.slug = 'towel_door_row' and bt.slug in ('primary', 'secondary'))
  or (e.slug = 'carioca' and bt.slug = 'warmup')
where not exists (
  select 1 from exercise_blocks l where l.exercise_id = e.id and l.block_type_id = bt.id
);

commit;
