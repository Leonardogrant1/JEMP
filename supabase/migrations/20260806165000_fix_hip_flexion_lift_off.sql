-- Hip Flexion Lift-Off: Fuß ruht auf einer erhöhten Fläche, dann wird das Bein
-- aktiv weiter angehoben. Beschreibung fehlte, war fälschlich mit Band getaggt
-- (Bild braucht nur eine Ablage) und dadurch zuhause/draußen nicht auswählbar.
do $$
declare
  ex_id uuid;
begin
  select id into ex_id from exercises where slug = 'hip_flexion_lift_off';
  if ex_id is null then
    raise notice 'hip_flexion_lift_off nicht gefunden — übersprungen';
    return;
  end if;

  -- 1. Beschreibung (de/en)
  update exercises
  set description_i18n = coalesce(description_i18n, '{}'::jsonb) || '{
    "de": "Der Fuß ruht auf einer erhöhten Fläche (Box, Bank oder Hantelscheibe) etwa auf Kniehöhe. Aus dieser Position hebst du das Bein aktiv noch ein Stück höher und hältst kurz. Kräftigt die Hüftbeuger im End-Bereich und verbessert die aktive Hüftbeweglichkeit.",
    "en": "Rest your foot on a raised surface (box, bench, or plate) at about knee height, then actively lift the leg a little higher and hold briefly. Strengthens the hip flexors at end range and improves active hip mobility."
  }'::jsonb
  where id = ex_id;

  -- 2. Equipment: Band raus — braucht nur eine Ablage, kein Gerät
  delete from exercise_equipments where exercise_id = ex_id;

  -- 3. Environments: überall machbar (gym/home/outdoor)
  delete from exercise_environments where exercise_id = ex_id;
  insert into exercise_environments (exercise_id, environment_id)
  select ex_id, id from environments where slug in ('gym', 'home', 'outdoor');
end $$;
