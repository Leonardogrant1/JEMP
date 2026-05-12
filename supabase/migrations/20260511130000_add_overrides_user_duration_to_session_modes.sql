ALTER TABLE session_modes
  ADD COLUMN overrides_user_duration boolean NOT NULL DEFAULT false;

-- activation and recovery always use their own duration range, ignoring user preference
UPDATE session_modes SET overrides_user_duration = true WHERE slug IN ('activation', 'recovery');
