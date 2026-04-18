CREATE TYPE plan_status AS ENUM (
    'draft',
    'active',
    'paused',
    'completed',
    'archived'
);

CREATE TYPE session_type AS ENUM (
    'training',
    'recovery'
);

CREATE TYPE load_type AS ENUM (
    'bodyweight',
    'kg',
    'percent_1rm',
    'rpe',
    'pace'
);

CREATE TABLE IF NOT EXISTS workout_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status plan_status NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_weeks INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

 CREATE TABLE IF NOT EXISTS workout_plan_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    session_type session_type NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
    order_index INTEGER NOT NULL,
    estimated_duration_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
    
CREATE TABLE IF NOT EXISTS workout_plan_session_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_plan_session_id UUID REFERENCES workout_plan_sessions(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    block_type_id UUID REFERENCES block_types(id) ON DELETE CASCADE,
    focused_category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_plan_session_block_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_plan_session_block_id UUID NOT NULL REFERENCES workout_plan_session_blocks(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    notes TEXT,
    -- Prescription
    target_sets INTEGER,
    target_reps_min INTEGER,
    target_reps_max INTEGER,
    target_duration_seconds INTEGER,
    target_distance_meters DOUBLE PRECISION,
    target_rest_seconds INTEGER,
    -- How load/intensity is prescribed
    target_load_type load_type,
    target_load_value DOUBLE PRECISION,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

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
    CHECK (target_load_value IS NULL OR target_load_value >= 0)
); 
    
CREATE TABLE IF NOT EXISTS workout_plan_targeted_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
    