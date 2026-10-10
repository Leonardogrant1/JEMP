-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- exercise_regions (10.10.): m:n-Regionen pro Übung, analog zu
-- exercise_environments/-equipments/-blocks. Ersetzt perspektivisch die
-- Ein-Region-Vereinfachung body_region/dominant_region:
--   role 'primary'   = genau eine Haupt-Region (heutiges effectiveRegion)
--   role 'secondary' = mitbelastete Regionen (RDL: glute, lower_back)
-- Backfill setzt nur die primary-Rows; secondaries kommen über die
-- Admin-KI-Anreicherung. Die alten Spalten bleiben, bis Legacy-Pfad und App
-- umgestellt sind — der Worker fällt bei leerer Relation auf sie zurück.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TYPE exercise_region_role AS ENUM ('primary', 'secondary');

CREATE TABLE exercise_regions (
    exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    region      body_region NOT NULL,
    role        exercise_region_role NOT NULL DEFAULT 'secondary',
    PRIMARY KEY (exercise_id, region)
);

-- Genau eine primary pro Übung — Datenintegrität statt Konvention.
CREATE UNIQUE INDEX exercise_regions_one_primary
    ON exercise_regions (exercise_id) WHERE role = 'primary';

ALTER TABLE exercise_regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercise_regions_select" ON exercise_regions
    FOR SELECT TO authenticated USING (true);

-- Backfill: primary = effectiveRegion (dominant_region vor body_region).
INSERT INTO exercise_regions (exercise_id, region, role)
SELECT id, COALESCE(dominant_region, body_region), 'primary'
FROM exercises
WHERE COALESCE(dominant_region, body_region) IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;
