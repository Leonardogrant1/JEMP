-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Session-Composition-Rework (Spec 2026-10-09 §2.1/§2.2): zwei orthogonale Achsen.
-- movement_type = Bewegungsebene (anatomisch), is_explosive = Dynamik.
-- Bewusst getrennt von movement_pattern (grobe Kategorie push/pull/legs/...).
CREATE TYPE movement_type AS ENUM ('sagittal', 'frontal', 'transverse');

ALTER TABLE exercises
  ADD COLUMN movement_type movement_type NOT NULL DEFAULT 'sagittal',
  ADD COLUMN is_explosive boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN exercises.movement_type IS 'Bewegungsebene: sagittal (vor/zurück), frontal (seitlich), transverse (rotierend). Orthogonal zur Dynamik (is_explosive).';
COMMENT ON COLUMN exercises.is_explosive IS 'Ballistisch/maximal beschleunigt ausgeführt (Plyos, Sprünge, Würfe, explosive Core). Universelle Dynamik-Achse; plyo_type bleibt die plyo-interne Intensitätsstufe.';
