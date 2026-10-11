-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Mobility-Sport-Präferenzen (QA 11.10.): Der strukturierte Mobility-Builder
-- zieht seine Picks über rotatedPoolWindow — Präferenzen (is_sport_specific =
-- false + Zeile) bekommen dort bis zu 2 reservierte Slots, der Rest rotiert
-- frei (Allrounder-Basis bleibt). Kuratierung nach Sport-Anforderung:
--   combat: Hüftöffnung in Abduktion/Rotation (Kicks)
--   team:   Leiste/Hüftbeuger (Richtungswechsel, Schuss)
--   racket: BWS-Rotation + Hüfte (Schlagrotation)
-- Idempotent.

begin;
set local lock_timeout = '5s';

insert into exercise_sport_groups (exercise_id, sport_group)
select e.id, v.grp
from (values
  ('combat_sports', 'deep_lunge_rotation'), ('combat_sports', 'loaded_deep_lunge_rotation'),
  ('combat_sports', 'cossack_squat'), ('combat_sports', 'loaded_cossack_squat'),
  ('combat_sports', 'hip_90_90_stretch'),
  ('team_sports', 'hip_flexion_lift_off'), ('team_sports', 'kneeling_adductor_stretch'),
  ('team_sports', 'cossack_squat'), ('team_sports', 'loaded_cossack_squat'),
  ('team_sports', 'hip_flexor_lunge_stretch'),
  ('racket_sports', 'deep_lunge_rotation'), ('racket_sports', 'loaded_deep_lunge_rotation'),
  ('racket_sports', 'standing_spinal_rotation'), ('racket_sports', 'thread_the_needle'),
  ('racket_sports', 'hip_90_90_stretch')
) as v(grp, slug)
join exercises e on e.slug = v.slug
where not exists (
  select 1 from exercise_sport_groups esg
  where esg.exercise_id = e.id and esg.sport_group = v.grp
);

commit;
