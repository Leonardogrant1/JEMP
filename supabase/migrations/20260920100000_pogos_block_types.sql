-- Pogos (20.09.): raus aus dem Warmup-Block, stattdessen als primary einsetzbar
-- (secondary bleibt). Plyometrischer Hauptreiz statt Aufwärmübung.

delete from exercise_blocks eb
using exercises e, block_types bt
where eb.exercise_id = e.id
  and eb.block_type_id = bt.id
  and e.slug = 'pogos'
  and bt.slug = 'warmup';

insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug in ('primary', 'secondary')
where e.slug = 'pogos'
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );
