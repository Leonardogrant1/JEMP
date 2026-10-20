-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv & nullable — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Emphasis der Session-Komposition (heavy/normal/light) pro Block persistieren:
-- die App braucht den "heavy lower"-Tag für die Beintag-Warnung beim Verschieben
-- flexibler Sprint-Sessions. NULL = Altbestand / Block ohne Emphasis (warmup etc.).

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE workout_plan_session_blocks
    ADD COLUMN emphasis text DEFAULT NULL
    CONSTRAINT workout_plan_session_blocks_emphasis_check
    CHECK (emphasis IN ('heavy', 'normal', 'light'));

COMMIT;
