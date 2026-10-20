-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Core-Typ-Backfill (Pool-Inventur 08.10.): 13 untaggte Core-Übungen.
-- stability = Anti-Bewegung (halten/verhindern), power = dynamisch/explosiv.

UPDATE exercises SET core_type = 'stability' WHERE slug IN (
    'ab_wheel_rollout', 'bird_dog', 'dead_bug', 'hollow_body_hold',
    'superman_hold', 'spiderman_plank'
) AND core_type IS NULL AND strength_pattern IS NULL;

UPDATE exercises SET core_type = 'power' WHERE slug IN (
    'v_up', 'bicycle_crunch', 'banded_bicycle', 'toe_touch_crunch', 'reverse_crunch'
) AND core_type IS NULL AND strength_pattern IS NULL;

-- KB-Chops: Rotations-Pattern wie cable_chop (Kraftübertragung durch die Kette)
UPDATE exercises SET strength_pattern = 'rotation' WHERE slug = 'half_kneeling_kb_chops'
  AND strength_pattern IS NULL;
