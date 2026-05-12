ALTER TABLE session_modes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view session modes"
    ON session_modes FOR SELECT TO authenticated
    USING (true);
