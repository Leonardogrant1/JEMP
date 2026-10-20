-- sl_box_jump -> single_leg_box_jump zusammenführen (Duplikat-Befund 28.09.):
-- beide beschreiben denselben explosiven einbeinigen Sprung AUF die Box
-- (Prod-Nutzung 2182 vs. 2068 Sessions). Keeper ist der ausgeschriebene Slug
-- mit korrekter image_group (vertical_jumps). single_leg_reactive_box_jump ist
-- KEIN Duplikat (reaktive Variante, minimale Bodenkontaktzeit) und bleibt.
--
-- Muster wie 20260823120000_merge_duplicate_exercises.sql: Referenzen umhängen,
-- dann Duplikat löschen (CASCADE räumt nur die Tag-Tabellen ab). Idempotent.

do $$
declare
  keeper_id uuid;
  duplicate_id uuid;
begin
  select id into duplicate_id from exercises where slug = 'sl_box_jump';
  select id into keeper_id   from exercises where slug = 'single_leg_box_jump';

  if duplicate_id is null then
    raise notice 'merge_sl_box_jump: sl_box_jump nicht vorhanden, übersprungen';
    return;
  end if;

  if keeper_id is null then
    raise warning 'merge_sl_box_jump: Keeper single_leg_box_jump fehlt, sl_box_jump bleibt unangetastet';
    return;
  end if;

  update workout_plan_session_block_exercises
    set exercise_id = keeper_id
    where exercise_id = duplicate_id;

  update workout_session_block_exercises
    set exercise_id = keeper_id
    where exercise_id = duplicate_id;

  delete from exercises where id = duplicate_id;

  raise notice 'merge_sl_box_jump: sl_box_jump -> single_leg_box_jump zusammengeführt';
end $$;
