-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Sport-Präferenzen (QA 10.10.): exercise_sport_groups trägt ab jetzt zwei
-- Semantiken über das bestehende is_sport_specific-Flag:
--   is_sport_specific = true  + Zeile → GATE (nur diese Gruppen sehen die Übung, wie bisher)
--   is_sport_specific = false + Zeile → PRÄFERENZ (für alle sichtbar, für diese
--                                        Gruppe in Pools/Prompt bevorzugt)
-- Seed: kuratierte combat_sports-Präferenzen (rotational/striking-spezifisch).
-- Idempotent.

begin;
set local lock_timeout = '5s';

insert into exercise_sport_groups (exercise_id, sport_group)
select e.id, 'combat_sports'
from exercises e
where e.slug in (
  'landmine_punch_throw', 'landmine_switch_punch',
  'rotational_med_ball_slam', 'rotational_med_ball_throw',
  'explosive_rotational_cable_press', 'heavy_bag_work', 'hill_sprint'
)
and not exists (
  select 1 from exercise_sport_groups esg
  where esg.exercise_id = e.id and esg.sport_group = 'combat_sports'
);

commit;
