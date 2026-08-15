-- Hip Flexion Lift-Off und Resisted Hip CARs sind eingelenkige Hüftbeuger-
-- Drills (geringe Last, End-Range) — gehören in accessory + warmup, nicht in
-- die primary/secondary-Slots der großen Grundbewegungen.
do $$
declare
  s text;
  ex_id uuid;
begin
  foreach s in array array['hip_flexion_lift_off', 'resisted_hip_cars'] loop
    select id into ex_id from exercises where slug = s;
    if ex_id is null then
      raise notice '% nicht gefunden — übersprungen', s;
      continue;
    end if;
    delete from exercise_blocks where exercise_id = ex_id;
    insert into exercise_blocks (exercise_id, block_type_id)
    select ex_id, id from block_types where slug in ('accessory', 'warmup');
  end loop;
end $$;
