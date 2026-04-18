

CREATE TABLE IF NOT EXISTS block_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TYPE movement_pattern AS ENUM ('push', 'pull', 'legs', 'core', 'isometric', 'plyometric', 'cardio', 'other');

CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    movement_pattern movement_pattern,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    min_level INT NOT NULL CHECK (min_level >= 1 AND min_level <= 5),
    max_level INT NOT NULL CHECK (max_level >= 1 AND max_level <= 5),
    youtube_url TEXT,
    thumbnail_storage_path TEXT,
    video_storage_path TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exercise_equipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES equipments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exercise_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    block_type_id UUID REFERENCES block_types(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

    
    