-- ─────────────────────────────────────────────────────────────
-- contraindication_tags: catalog of movement-pattern contraindications
-- used to flag exercises that conflict with a user's injury constraints
-- ─────────────────────────────────────────────────────────────

CREATE TABLE contraindication_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO contraindication_tags (slug) VALUES
  ('deep_knee_flexion_loaded'),
  ('jumping_landing'),
  ('sprinting_max_velocity'),
  ('hamstring_high_speed_load'),
  ('overhead_pressing'),
  ('shoulder_end_range'),
  ('wrist_extension_loaded'),
  ('spinal_flexion_loaded'),
  ('spinal_compression_heavy'),
  ('hip_flexion_loaded_deep'),
  ('adductor_loaded_stretch'),
  ('ankle_lateral_stress'),
  ('ankle_plantar_load_explosive'),
  ('elbow_extension_loaded'),
  ('spinal_rotation_loaded')
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- exercise_contraindications: many-to-many between exercises and
-- contraindication tags. Exercises with NO rows here carry no
-- contraindication flags.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE exercise_contraindications (
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  contraindication_tag_id UUID NOT NULL REFERENCES contraindication_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (exercise_id, contraindication_tag_id)
);

-- ─────────────────────────────────────────────────────────────
-- user_injury_constraints: a user's active/historical injury constraints,
-- each tied to one contraindication tag. Revoked (not deleted) on change.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE user_injury_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  contraindication_tag_id UUID NOT NULL REFERENCES contraindication_tags(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('block', 'light_only')),
  acute BOOLEAN NOT NULL DEFAULT false,
  source_note TEXT,
  origin TEXT NOT NULL CHECK (origin IN ('onboarding', 'recheck', 'manual')),
  confirmed_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX user_injury_constraints_active_uniq
  ON user_injury_constraints (user_id, contraindication_tag_id) WHERE revoked_at IS NULL;

-- ─────────────────────────────────────────────────────────────
-- user_profiles: injury extraction/confirmation status
-- ─────────────────────────────────────────────────────────────

ALTER TABLE user_profiles
  ADD COLUMN injury_extraction_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (injury_extraction_status IN ('pending', 'confirmed', 'failed')),
  ADD COLUMN injury_confirmed_at TIMESTAMPTZ;

-- RLS
ALTER TABLE contraindication_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_contraindications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_injury_constraints ENABLE ROW LEVEL SECURITY;

-- contraindication_tags: readable by all authenticated users
CREATE POLICY "contraindication_tags_select" ON contraindication_tags
    FOR SELECT TO authenticated USING (true);

-- exercise_contraindications: readable by all authenticated users
CREATE POLICY "exercise_contraindications_select" ON exercise_contraindications
    FOR SELECT TO authenticated USING (true);

-- user_injury_constraints: users manage their own rows
CREATE POLICY "user_injury_constraints_select" ON user_injury_constraints
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_injury_constraints_insert" ON user_injury_constraints
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_injury_constraints_update" ON user_injury_constraints
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_injury_constraints_delete" ON user_injury_constraints
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Service role bypass for edge functions
CREATE POLICY "user_injury_constraints_service_select" ON user_injury_constraints
    FOR SELECT TO service_role USING (true);
