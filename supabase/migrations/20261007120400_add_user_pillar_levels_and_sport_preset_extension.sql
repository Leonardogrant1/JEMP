-- Prod-DDL safety (spec §6.1): fail fast instead of queueing behind a lock.
SET LOCAL lock_timeout = '5s';

-- Per-user pillar priority levels (spec §1.5). set_by_wizard marks
-- levels written by the new wizard — the activation signal for the new
-- generator path (spec §6.5); translated legacy rankings stay false.
CREATE TABLE IF NOT EXISTS user_pillar_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
    set_by_wizard BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, category_id)
);

ALTER TABLE user_pillar_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pillar levels"
    ON user_pillar_levels FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pillar levels"
    ON user_pillar_levels FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pillar levels"
    ON user_pillar_levels FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pillar levels"
    ON user_pillar_levels FOR DELETE
    USING (auth.uid() = user_id);

-- Sport preset extension (spec §1.5, §4.3): relevance 0 = pillar
-- irrelevant for the sport (hidden from the user); score_weight is the
-- sport weighting layer over the raw pillar scores.
ALTER TABLE sport_category_relevance
    DROP CONSTRAINT sport_category_relevance_relevance_check;
ALTER TABLE sport_category_relevance
    ADD CONSTRAINT sport_category_relevance_relevance_check CHECK (relevance BETWEEN 0 AND 3);
ALTER TABLE sport_category_relevance
    ADD COLUMN score_weight DOUBLE PRECISION NOT NULL DEFAULT 1.0;
