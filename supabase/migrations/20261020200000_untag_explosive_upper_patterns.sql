-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv-harmlos — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Taxonomie-Fix (QA 20.10., incline_plyo_push_up-Befund): Explosive Upper-
-- Plyo-Übungen trugen strength_pattern-Tags und waren damit Kraft-Pool-
-- Bürger — Explosiv-Qualität lebt aber fern des Versagens, und die
-- Bodyweight-Varianten bekämen im Kraftblock seit der AMRAP-Regel sogar
-- "Max bis kurz vors Versagen". Plyo-Block-Pools selektieren über die
-- Kategorie, die Übungen bleiben dort voll verfügbar.
-- BEHALTEN bewusst: dumbbell_clean/dumbbell_snatch (geladene Ballistik,
-- Int 9 = echte Hinge-Kraft-Option, kein AMRAP-Risiko) und die loaded_*-
-- Mobility-Drills (Entscheidung 20261020100000).
begin;
set local lock_timeout = '5s';

update exercises set strength_pattern = null, updated_at = now()
where slug in (
  'incline_plyo_push_up',
  'kneeling_plyo_push_up',
  'depth_push_up',
  'explosive_cable_press',
  'explosive_cable_row'
) and strength_pattern is not null;

commit;
