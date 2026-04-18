CREATE TYPE session_status AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'skipped',
    'cancelled'
);

CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    workout_plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE,
    workout_plan_session_id UUID REFERENCES workout_plan_sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    session_type session_type,
    scheduled_at TIMESTAMPTZ,
    status session_status NOT NULL DEFAULT 'scheduled',
    estimated_duration_minutes INTEGER,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_session_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
    workout_plan_session_block_id UUID REFERENCES workout_plan_session_blocks(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    block_type_id UUID REFERENCES block_types(id) ON DELETE CASCADE,
    focused_category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_session_block_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_session_block_id UUID NOT NULL REFERENCES workout_session_blocks(id) ON DELETE CASCADE,
    workout_plan_session_block_id UUID REFERENCES workout_plan_session_blocks(id) ON DELETE SET NULL,
    workout_plan_session_block_exercise_id UUID REFERENCES workout_plan_session_block_exercises(id) ON DELETE SET NULL,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    -- Prescription copied from plan blueprint
    target_sets INTEGER,
    target_reps_min INTEGER,
    target_reps_max INTEGER,
    target_duration_seconds INTEGER,
    target_distance_meters DOUBLE PRECISION,
    target_rest_seconds INTEGER,
    target_load_type load_type,
    target_load_value DOUBLE PRECISION,

    -- Concrete recommendation for this specific session
    recommended_load_value DOUBLE PRECISION,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (workout_session_block_id, order_index),

    -- Basic sanity checks
    CHECK (order_index >= 0),
    CHECK (target_sets IS NULL OR target_sets > 0),
    CHECK (target_reps_min IS NULL OR target_reps_min > 0),
    CHECK (target_reps_max IS NULL OR target_reps_max > 0),
    CHECK (
        target_reps_min IS NULL
        OR target_reps_max IS NULL
        OR target_reps_min <= target_reps_max
    ),
    CHECK (target_duration_seconds IS NULL OR target_duration_seconds > 0),
    CHECK (target_distance_meters IS NULL OR target_distance_meters > 0),
    CHECK (target_rest_seconds IS NULL OR target_rest_seconds >= 0),
    CHECK (target_load_value IS NULL OR target_load_value >= 0),
    CHECK (recommended_load_value IS NULL OR recommended_load_value >= 0)
);


CREATE TABLE IF NOT EXISTS workout_session_performed_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    workout_session_block_id UUID NOT NULL REFERENCES workout_session_blocks(id) ON DELETE CASCADE,
    workout_session_block_exercise_id UUID NOT NULL REFERENCES workout_session_block_exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    performed_reps INTEGER,
    performed_load_value DOUBLE PRECISION,
    performed_duration_seconds INTEGER,
    performed_distance_meters DOUBLE PRECISION,
    performed_rpe INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
    -- Ensure one row per set
    UNIQUE (workout_session_block_exercise_id, set_number),
  
    -- Basic sanity checks
    CHECK (set_number > 0),
    CHECK (performed_reps IS NULL OR performed_reps > 0),
    CHECK (performed_load_value IS NULL OR performed_load_value >= 0),
    CHECK (performed_duration_seconds IS NULL OR performed_duration_seconds > 0),
    CHECK (performed_distance_meters IS NULL OR performed_distance_meters > 0),
    CHECK (performed_rpe IS NULL OR performed_rpe >= 1 AND performed_rpe <= 10),
    CHECK (
        performed_reps IS NOT NULL
        OR performed_load_value IS NOT NULL
        OR performed_duration_seconds IS NOT NULL
        OR performed_distance_meters IS NOT NULL
        OR performed_rpe IS NOT NULL
    )
);
    
    