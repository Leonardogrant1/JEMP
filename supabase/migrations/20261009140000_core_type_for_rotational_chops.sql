-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Review-Fix (Composition-Rework Final Review, Finding #1): Die rumpf-isolierten
-- Rotations-Übungen hatten kein core_type — der transverse-Core-Pool war leer,
-- obwohl die Chops genau diese Funktion tragen (Rotation gegen Widerstand,
-- Rumpf arbeitet, nicht Schulter/Arm wie bei den Würfen in upper_plyo).
UPDATE exercises SET core_type = 'power'
WHERE slug IN ('cable_chop', 'half_kneeling_kb_chops') AND core_type IS NULL;
