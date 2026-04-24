-- Score (1-100) calculated by the score calculator at assessment time
ALTER TABLE metric_entries ADD COLUMN IF NOT EXISTS score INTEGER CHECK (score BETWEEN 1 AND 100);

-- Required for upsert in use-complete-assessment.ts
ALTER TABLE user_category_levels
    ADD CONSTRAINT user_category_levels_user_id_category_id_key
    UNIQUE (user_id, category_id);
