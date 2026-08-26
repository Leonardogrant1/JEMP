-- Duplikat-Übungen zusammenführen (Duplikat-Report vom 23.08.):
--   dips                 <- tricep_dip           (Prod-Nutzung 1287 vs. 24 Sessions)
--   depth_jump           <- drop_jump            (Prod-Nutzung 1662 vs. 489 Sessions)
--   nordic_hamstring_curl <- nordic_curl         (Prod-Nutzung 3170 vs. 914 Sessions)
--   med_ball_overhead_throw   <- mb_overhead_throw   (Alt-Seed, existiert nur lokal)
--   rotational_med_ball_throw <- mb_rotational_throw (Alt-Seed, existiert nur lokal)
--   med_ball_chest_pass       <- mb_chest_throw      (Alt-Seed, existiert nur lokal)
--
-- Vorgehen je Paar: Referenzen in Plan-/Session-Daten auf den Keeper umhängen,
-- danach das Duplikat löschen (CASCADE räumt exercise_blocks/_equipments/
-- _environments/_sport_groups mit ab). Slug-basiert und idempotent: fehlt eine
-- der beiden Übungen, wird das Paar übersprungen (prod-portierbar).

do $$
declare
  pair record;
  keeper_id uuid;
  duplicate_id uuid;
begin
  for pair in
    select * from (values
      ('tricep_dip',          'dips'),
      ('drop_jump',           'depth_jump'),
      ('nordic_curl',         'nordic_hamstring_curl'),
      ('mb_overhead_throw',   'med_ball_overhead_throw'),
      ('mb_rotational_throw', 'rotational_med_ball_throw'),
      ('mb_chest_throw',      'med_ball_chest_pass')
    ) as t(duplicate_slug, keeper_slug)
  loop
    select id into duplicate_id from exercises where slug = pair.duplicate_slug;
    select id into keeper_id   from exercises where slug = pair.keeper_slug;

    if duplicate_id is null then
      raise notice 'merge_duplicate_exercises: % nicht vorhanden, übersprungen', pair.duplicate_slug;
      continue;
    end if;

    if keeper_id is null then
      raise warning 'merge_duplicate_exercises: Keeper % fehlt, % bleibt unangetastet', pair.keeper_slug, pair.duplicate_slug;
      continue;
    end if;

    update workout_plan_session_block_exercises
      set exercise_id = keeper_id
      where exercise_id = duplicate_id;

    update workout_session_block_exercises
      set exercise_id = keeper_id
      where exercise_id = duplicate_id;

    delete from exercises where id = duplicate_id;

    raise notice 'merge_duplicate_exercises: % -> % zusammengeführt', pair.duplicate_slug, pair.keeper_slug;
  end loop;
end $$;
