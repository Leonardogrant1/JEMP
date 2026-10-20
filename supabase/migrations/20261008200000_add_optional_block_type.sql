-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Optional-Block (User-Entscheid 08.10., Original-Plan): isolierte Arm-Arbeit
-- (Bizeps/Trizeps) als eigener Kür-Block — raus aus dem funktionellen
-- Accessory-Pool, damit Curls nie Copenhagen & Co. verdrängen.
INSERT INTO block_types (slug)
SELECT 'optional'
WHERE NOT EXISTS (SELECT 1 FROM block_types WHERE slug = 'optional');
