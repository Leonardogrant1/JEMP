-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Push/Pull-Varianten-Backfill (User-Befund 08.10.): die Wochen-Rotation
-- vertikal ↔ horizontal ist nur so präzise wie das Tagging. Arm-Isolationen
-- (Curls, Extensions, Raises) bleiben bewusst untaggt — sie gehören in den
-- Accessory-Block, nicht als Hauptübung in Push/Pull.

UPDATE exercises SET strength_pattern = 'push_horizontal' WHERE slug IN (
    'banded_chest_press_floor', 'decline_push_up', 'diamond_push_up',
    'dumbbell_floor_press', 'wide_grip_push_up', 'shoulder_tap_push_up'
) AND strength_pattern IS NULL;

UPDATE exercises SET strength_pattern = 'push_vertical' WHERE slug IN (
    'banded_overhead_press', 'dumbbell_shoulder_press', 'overhead_press',
    'pike_push_up', 'dumbbell_curl_to_press', 'chair_dip'
) AND strength_pattern IS NULL;

UPDATE exercises SET strength_pattern = 'pull_horizontal' WHERE slug IN (
    'banded_row', 'table_inverted_row', 'banded_face_pull'
) AND strength_pattern IS NULL;

UPDATE exercises SET strength_pattern = 'pull_vertical' WHERE slug IN (
    'negative_pull_up'
) AND strength_pattern IS NULL;

-- Korrektur Phase-1-Backfill: Dips sind VERTIKALER Push (Druck nach unten,
-- Overhead-Press-Familie invers) — nicht horizontal wie Bankdrücken.
UPDATE exercises SET strength_pattern = 'push_vertical'
WHERE slug IN ('dips') AND strength_pattern = 'push_horizontal';
