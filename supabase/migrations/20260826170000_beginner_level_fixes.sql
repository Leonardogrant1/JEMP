-- Beginner-Fixes aus dem Fußballer-Szenario (U18, home/outdoor, Levels 5–15,
-- 26.08.): Mit Jumps-Level 12 blieben nur 3 Sprungübungen (broad_jump und
-- vertical_jump starteten erst bei Lvl 20 — das sind aber Einsteiger-
-- Grundsprünge), und der Hinge-Block hatte auf Anfänger-Level nur 2 Kandidaten
-- (→ 1-Übungs-Primary am Reduced-Tag, weil Phase C Wiederholungen vermeidet).
--
-- bodyweight_good_morning bewusst NICHT umgetaggt: Kategorie mobility,
-- ein secondary-Tag würde sie nicht in Strength-Pools bringen.
-- Idempotent, prod-portierbar.

-- ── Level-Korrekturen: Einsteiger-Grundsprünge ───────────────────────────────
update exercises
set min_level = 10
where slug in ('broad_jump', 'vertical_jump')
  and min_level > 10;

-- ── Tagging: Beginner-Material für Main-Blöcke ───────────────────────────────
insert into exercise_blocks (exercise_id, block_type_id)
select e.id, bt.id
from exercises e
join block_types bt on bt.slug = 'secondary'
where e.slug in ('pogos', 'glute_bridge', 'single_leg_glute_bridge')
  and not exists (
    select 1 from exercise_blocks eb
    where eb.exercise_id = e.id and eb.block_type_id = bt.id
  );
