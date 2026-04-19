-- ============================================================
-- READ-ONLY / ADMIN-MANAGED TABLES
-- SELECT for authenticated users; writes only via service role
-- ============================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view categories"
    ON categories FOR SELECT TO authenticated
    USING (true);

ALTER TABLE environments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view environments"
    ON environments FOR SELECT TO authenticated
    USING (true);

ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view equipments"
    ON equipments FOR SELECT TO authenticated
    USING (true);

ALTER TABLE environment_equipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view environment equipments"
    ON environment_equipments FOR SELECT TO authenticated
    USING (true);

ALTER TABLE block_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view block types"
    ON block_types FOR SELECT TO authenticated
    USING (true);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view exercises"
    ON exercises FOR SELECT TO authenticated
    USING (true);

ALTER TABLE exercise_equipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view exercise equipments"
    ON exercise_equipments FOR SELECT TO authenticated
    USING (true);

ALTER TABLE exercise_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view exercise blocks"
    ON exercise_blocks FOR SELECT TO authenticated
    USING (true);

ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view metrics"
    ON metrics FOR SELECT TO authenticated
    USING (true);

ALTER TABLE category_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view category metrics"
    ON category_metrics FOR SELECT TO authenticated
    USING (true);

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view assessments"
    ON assessments FOR SELECT TO authenticated
    USING (true);

ALTER TABLE assessment_equipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view assessment equipments"
    ON assessment_equipments FOR SELECT TO authenticated
    USING (true);


-- ============================================================
-- USER PROFILE TABLES
-- ============================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

ALTER TABLE user_category_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own category levels"
    ON user_category_levels FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own category levels"
    ON user_category_levels FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own category levels"
    ON user_category_levels FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own category levels"
    ON user_category_levels FOR DELETE
    USING (auth.uid() = user_id);

ALTER TABLE user_targeted_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own targeted categories"
    ON user_targeted_categories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own targeted categories"
    ON user_targeted_categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own targeted categories"
    ON user_targeted_categories FOR DELETE
    USING (auth.uid() = user_id);

ALTER TABLE user_equipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own equipments"
    ON user_equipments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own equipments"
    ON user_equipments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own equipments"
    ON user_equipments FOR DELETE
    USING (auth.uid() = user_id);


-- ============================================================
-- WORKOUT PLAN TABLES
-- ============================================================

ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout plans"
    ON workout_plans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout plans"
    ON workout_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout plans"
    ON workout_plans FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout plans"
    ON workout_plans FOR DELETE
    USING (auth.uid() = user_id);

ALTER TABLE workout_plan_targeted_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout plan targeted categories"
    ON workout_plan_targeted_categories FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM workout_plans wp
        WHERE wp.id = workout_plan_id AND wp.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own workout plan targeted categories"
    ON workout_plan_targeted_categories FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM workout_plans wp
        WHERE wp.id = workout_plan_id AND wp.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete own workout plan targeted categories"
    ON workout_plan_targeted_categories FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM workout_plans wp
        WHERE wp.id = workout_plan_id AND wp.user_id = auth.uid()
    ));

ALTER TABLE workout_plan_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout plan sessions"
    ON workout_plan_sessions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM workout_plans wp
        WHERE wp.id = plan_id AND wp.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own workout plan sessions"
    ON workout_plan_sessions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM workout_plans wp
        WHERE wp.id = plan_id AND wp.user_id = auth.uid()
    ));

CREATE POLICY "Users can update own workout plan sessions"
    ON workout_plan_sessions FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM workout_plans wp
        WHERE wp.id = plan_id AND wp.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete own workout plan sessions"
    ON workout_plan_sessions FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM workout_plans wp
        WHERE wp.id = plan_id AND wp.user_id = auth.uid()
    ));

ALTER TABLE workout_plan_session_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout plan session blocks"
    ON workout_plan_session_blocks FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM workout_plan_sessions wps
        JOIN workout_plans wp ON wp.id = wps.plan_id
        WHERE wps.id = workout_plan_session_id AND wp.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own workout plan session blocks"
    ON workout_plan_session_blocks FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM workout_plan_sessions wps
        JOIN workout_plans wp ON wp.id = wps.plan_id
        WHERE wps.id = workout_plan_session_id AND wp.user_id = auth.uid()
    ));

CREATE POLICY "Users can update own workout plan session blocks"
    ON workout_plan_session_blocks FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM workout_plan_sessions wps
        JOIN workout_plans wp ON wp.id = wps.plan_id
        WHERE wps.id = workout_plan_session_id AND wp.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete own workout plan session blocks"
    ON workout_plan_session_blocks FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM workout_plan_sessions wps
        JOIN workout_plans wp ON wp.id = wps.plan_id
        WHERE wps.id = workout_plan_session_id AND wp.user_id = auth.uid()
    ));

ALTER TABLE workout_plan_session_block_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout plan session block exercises"
    ON workout_plan_session_block_exercises FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM workout_plan_session_blocks wpsb
        JOIN workout_plan_sessions wps ON wps.id = wpsb.workout_plan_session_id
        JOIN workout_plans wp ON wp.id = wps.plan_id
        WHERE wpsb.id = workout_plan_session_block_id AND wp.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own workout plan session block exercises"
    ON workout_plan_session_block_exercises FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM workout_plan_session_blocks wpsb
        JOIN workout_plan_sessions wps ON wps.id = wpsb.workout_plan_session_id
        JOIN workout_plans wp ON wp.id = wps.plan_id
        WHERE wpsb.id = workout_plan_session_block_id AND wp.user_id = auth.uid()
    ));

CREATE POLICY "Users can update own workout plan session block exercises"
    ON workout_plan_session_block_exercises FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM workout_plan_session_blocks wpsb
        JOIN workout_plan_sessions wps ON wps.id = wpsb.workout_plan_session_id
        JOIN workout_plans wp ON wp.id = wps.plan_id
        WHERE wpsb.id = workout_plan_session_block_id AND wp.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete own workout plan session block exercises"
    ON workout_plan_session_block_exercises FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM workout_plan_session_blocks wpsb
        JOIN workout_plan_sessions wps ON wps.id = wpsb.workout_plan_session_id
        JOIN workout_plans wp ON wp.id = wps.plan_id
        WHERE wpsb.id = workout_plan_session_block_id AND wp.user_id = auth.uid()
    ));


-- ============================================================
-- WORKOUT SESSION TABLES
-- ============================================================

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout sessions"
    ON workout_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout sessions"
    ON workout_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout sessions"
    ON workout_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout sessions"
    ON workout_sessions FOR DELETE
    USING (auth.uid() = user_id);

ALTER TABLE workout_session_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout session blocks"
    ON workout_session_blocks FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM workout_sessions ws
        WHERE ws.id = workout_session_id AND ws.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own workout session blocks"
    ON workout_session_blocks FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM workout_sessions ws
        WHERE ws.id = workout_session_id AND ws.user_id = auth.uid()
    ));

CREATE POLICY "Users can update own workout session blocks"
    ON workout_session_blocks FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM workout_sessions ws
        WHERE ws.id = workout_session_id AND ws.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete own workout session blocks"
    ON workout_session_blocks FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM workout_sessions ws
        WHERE ws.id = workout_session_id AND ws.user_id = auth.uid()
    ));

ALTER TABLE workout_session_block_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout session block exercises"
    ON workout_session_block_exercises FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM workout_session_blocks wsb
        JOIN workout_sessions ws ON ws.id = wsb.workout_session_id
        WHERE wsb.id = workout_session_block_id AND ws.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own workout session block exercises"
    ON workout_session_block_exercises FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM workout_session_blocks wsb
        JOIN workout_sessions ws ON ws.id = wsb.workout_session_id
        WHERE wsb.id = workout_session_block_id AND ws.user_id = auth.uid()
    ));

CREATE POLICY "Users can update own workout session block exercises"
    ON workout_session_block_exercises FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM workout_session_blocks wsb
        JOIN workout_sessions ws ON ws.id = wsb.workout_session_id
        WHERE wsb.id = workout_session_block_id AND ws.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete own workout session block exercises"
    ON workout_session_block_exercises FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM workout_session_blocks wsb
        JOIN workout_sessions ws ON ws.id = wsb.workout_session_id
        WHERE wsb.id = workout_session_block_id AND ws.user_id = auth.uid()
    ));

ALTER TABLE workout_session_performed_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own performed sets"
    ON workout_session_performed_sets FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM workout_sessions ws
        WHERE ws.id = workout_session_id AND ws.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own performed sets"
    ON workout_session_performed_sets FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM workout_sessions ws
        WHERE ws.id = workout_session_id AND ws.user_id = auth.uid()
    ));

CREATE POLICY "Users can update own performed sets"
    ON workout_session_performed_sets FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM workout_sessions ws
        WHERE ws.id = workout_session_id AND ws.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete own performed sets"
    ON workout_session_performed_sets FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM workout_sessions ws
        WHERE ws.id = workout_session_id AND ws.user_id = auth.uid()
    ));


-- ============================================================
-- ASSESSMENT TABLES
-- ============================================================

ALTER TABLE user_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assessments"
    ON user_assessments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessments"
    ON user_assessments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessments"
    ON user_assessments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assessments"
    ON user_assessments FOR DELETE
    USING (auth.uid() = user_id);


-- ============================================================
-- METRIC ENTRIES
-- ============================================================

ALTER TABLE metric_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metric entries"
    ON metric_entries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metric entries"
    ON metric_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metric entries"
    ON metric_entries FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own metric entries"
    ON metric_entries FOR DELETE
    USING (auth.uid() = user_id);
