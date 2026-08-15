-- Display unit preference. Values are always stored metric (kg/cm) —
-- this only controls how the app renders and accepts input.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS unit_system text NOT NULL DEFAULT 'metric'
    CHECK (unit_system IN ('metric', 'imperial'));
