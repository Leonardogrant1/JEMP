CREATE TABLE IF NOT EXISTS sports (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT    NOT NULL UNIQUE,
    group_name  TEXT    NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sport_category_relevance (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_id    UUID    NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
    category_id UUID    NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    relevance   INTEGER NOT NULL CHECK (relevance BETWEEN 1 AND 3),
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (sport_id, category_id)
);

ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view sports"
    ON sports FOR SELECT TO authenticated USING (true);

ALTER TABLE sport_category_relevance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view sport category relevance"
    ON sport_category_relevance FOR SELECT TO authenticated USING (true);

ALTER TABLE user_profiles
    ADD COLUMN sport_id UUID REFERENCES sports(id) ON DELETE SET NULL;
