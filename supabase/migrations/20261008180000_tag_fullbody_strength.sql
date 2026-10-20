-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Ganzkörper-Strength-Tagging (QA-Runde 08.10.): die vier offenen Fälle.
-- Thruster ist das wörtliche covered_patterns-Beispiel aus Spec §1.3.
UPDATE exercises SET strength_pattern = 'knee_dominant',
                     covered_patterns = ARRAY['push_vertical']::strength_pattern[]
WHERE slug = 'dumbbell_thruster' AND strength_pattern IS NULL;

UPDATE exercises SET strength_pattern = 'hinge'
WHERE slug = 'isometric_mid_thigh_pull' AND strength_pattern IS NULL;

-- Carries/Get-up: Core-Stabilität (Anti-Flexion/-Rotation) — core_type statt
-- strength_pattern (Spec-§1.3-Schema-Regel).
UPDATE exercises SET core_type = 'stability'
WHERE slug IN ('farmers_walk', 'turkish_get_up')
  AND core_type IS NULL AND strength_pattern IS NULL;
