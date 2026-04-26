-- ─────────────────────────────────────────────────────────────
-- exercise_environments: many-to-many between exercises and environments
-- Only tag exercises with restrictions.
-- Exercises with NO rows here = available in all environments.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exercise_environments (
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    PRIMARY KEY (exercise_id, environment_id)
);

-- ─────────────────────────────────────────────────────────────
-- user_environments: which environments a user has access to
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_environments (
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, environment_id)
);

-- RLS
ALTER TABLE exercise_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_environments ENABLE ROW LEVEL SECURITY;

-- exercise_environments: readable by all authenticated users
CREATE POLICY "exercise_environments_select" ON exercise_environments
    FOR SELECT TO authenticated USING (true);

-- user_environments: users manage their own rows
CREATE POLICY "user_environments_select" ON user_environments
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_environments_insert" ON user_environments
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_environments_delete" ON user_environments
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Service role bypass for edge functions
CREATE POLICY "user_environments_service_select" ON user_environments
    FOR SELECT TO service_role USING (true);
