-- Dowel Overhead Squat aufräumen: reine Mobility-/Technik-Drill mit einem Stab,
-- war aber als Kraftübung (primary/secondary/accessory) + Langhantel getaggt
-- und hatte keine Environments. Alles slug-basiert, damit auf Prod portierbar.
do $$
declare
  ex_id uuid;
begin
  select id into ex_id from exercises where slug = 'dowel_overhead_squat';
  if ex_id is null then
    raise notice 'dowel_overhead_squat nicht gefunden — übersprungen';
    return;
  end if;

  -- 1. Beschreibung (de/en) — Muster + Trainingseffekt wie bei den anderen
  update exercises
  set description_i18n = coalesce(description_i18n, '{}'::jsonb) || '{
    "de": "Tiefe Überkopf-Kniebeuge mit einem Stab in gestreckten Armen. Mobilisiert Schultern, Brustwirbelsäule, Hüfte und Sprunggelenke und schult das saubere Overhead-Squat-Muster — ideal als Vorbereitung vor dem Training.",
    "en": "Deep overhead squat holding a dowel with straight arms. Mobilizes the shoulders, thoracic spine, hips, and ankles while grooving a clean overhead-squat pattern — ideal as movement prep before training."
  }'::jsonb
  where id = ex_id;

  -- 2. Block-Typen: nur warmup (keine Kraftblöcke)
  delete from exercise_blocks where exercise_id = ex_id;
  insert into exercise_blocks (exercise_id, block_type_id)
  select ex_id, id from block_types where slug = 'warmup';

  -- 3. Equipment: Langhantel raus — ein Stab braucht kein gelistetes Gerät
  delete from exercise_equipments where exercise_id = ex_id;

  -- 4. Environments: überall machbar (gym/home/outdoor)
  delete from exercise_environments where exercise_id = ex_id;
  insert into exercise_environments (exercise_id, environment_id)
  select ex_id, id from environments where slug in ('gym', 'home', 'outdoor');
end $$;
