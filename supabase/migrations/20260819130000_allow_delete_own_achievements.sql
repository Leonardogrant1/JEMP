-- Users may delete their own unlocks (needed for the __DEV__ reset button;
-- harmless in prod — re-awarding happens on the next qualifying completion).
CREATE POLICY "Users can delete their own achievements"
    ON user_achievements
    FOR DELETE
    USING (auth.uid() = user_id);
