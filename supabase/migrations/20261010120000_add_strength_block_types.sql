-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Upper/Lower-Strength-Blöcke (Spec 2026-10-10): push/pull/lower_body werden
-- nicht mehr komponiert, ihre Rows bleiben für Alt-Pläne bestehen. Idempotent.

BEGIN;
SET LOCAL lock_timeout = '5s';

INSERT INTO block_types (slug)
SELECT s FROM unnest(ARRAY['lower_strength', 'upper_strength']) AS s
WHERE NOT EXISTS (SELECT 1 FROM block_types bt WHERE bt.slug = s);

COMMIT;
