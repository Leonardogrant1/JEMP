CREATE TYPE metric_unit AS ENUM ('kg', 'm', 'cm', 's', 'min', 'hr', 'kcal', 'bpm', 'percent', 'count', 'other');

CREATE TYPE metric_source_type AS ENUM ('manual', 'assessment', 'session', 'derived');

CREATE TABLE IF NOT EXISTS metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL, 
    unit metric_unit NOT NULL,
    higher_is_better BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);


CREATE TABLE IF NOT EXISTS category_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    metric_id UUID REFERENCES metrics(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

