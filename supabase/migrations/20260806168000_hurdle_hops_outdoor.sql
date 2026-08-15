-- Hürden-Sprünge waren nur im Gym auswählbar, obwohl ihr Equipment
-- (mini_hurdles) laut environment_equipments auch outdoor verfügbar ist.
-- Environment der Übungen an die Equipment-Verfügbarkeit angleichen: gym + outdoor.
do $$
declare
  s text;
  ex_id uuid;
begin
  foreach s in array array['hurdle_hops', 'lateral_hurdle_hop'] loop
    select id into ex_id from exercises where slug = s;
    if ex_id is null then
      raise notice '% nicht gefunden — übersprungen', s;
      continue;
    end if;
    delete from exercise_environments where exercise_id = ex_id;
    insert into exercise_environments (exercise_id, environment_id)
    select ex_id, id from environments where slug in ('gym', 'outdoor');
  end loop;
end $$;
