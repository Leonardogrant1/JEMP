CREATE TABLE IF NOT EXISTS metric_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    metric_id UUID REFERENCES metrics(id) ON DELETE CASCADE,
    value NUMERIC NOT NULL,
    source_type metric_source_type NOT NULL,
    user_assessment_id UUID REFERENCES user_assessments(id) ON DELETE CASCADE,
    workout_session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
