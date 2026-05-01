ALTER TABLE user_profiles
  ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin', 'tester'));
