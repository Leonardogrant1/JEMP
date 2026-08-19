CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    achievement_slug TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    value NUMERIC,
    UNIQUE (user_id, achievement_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id
    ON user_achievements (user_id);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Unlocks are immutable: SELECT + INSERT only, no UPDATE/DELETE policies.
CREATE POLICY "Users can read their own achievements"
    ON user_achievements
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
    ON user_achievements
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
