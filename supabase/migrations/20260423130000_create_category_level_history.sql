CREATE TABLE IF NOT EXISTS user_category_level_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    level_score INTEGER NOT NULL CHECK (level_score BETWEEN 1 AND 100),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_category_level_history_user_id
    ON user_category_level_history (user_id, category_id, recorded_at);

ALTER TABLE user_category_level_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own history"
    ON user_category_level_history
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
