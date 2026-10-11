-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- banded_hip_thrust deckeln (QA 11.10.): Band-Aktivierungsvariante ohne
-- strength_pattern → Accessory-Pool, aber für hohe Strength-Level kein Reiz
-- (leo2, Level 80, bekam sie 3× pro Woche). Der echte Hip Thrust (hinge, Int 8)
-- bleibt im Kraft-Pool. max_level-Muster wie curtsy_lunge/negative_pull_up.
-- Idempotent.

begin;
set local lock_timeout = '5s';

update exercises set max_level = 50
where slug = 'banded_hip_thrust' and max_level > 50;

commit;
