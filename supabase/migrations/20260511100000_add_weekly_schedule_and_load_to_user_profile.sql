ALTER TABLE user_profiles
  ADD COLUMN weekly_schedule jsonb
    NOT NULL DEFAULT '{"sessions": [], "notes": null}'::jsonb;

ALTER TABLE user_profiles
  ADD COLUMN load_score integer
    NOT NULL DEFAULT 0;

ALTER TABLE user_profiles
  ADD COLUMN load_profile text
    NOT NULL DEFAULT 'low'
    CHECK (load_profile IN ('low', 'medium', 'high'));

ALTER TABLE user_profiles
  ADD COLUMN weekly_schedule_updated_at timestamptz;
