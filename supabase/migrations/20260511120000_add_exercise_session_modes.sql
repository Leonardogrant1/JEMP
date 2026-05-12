CREATE TABLE exercise_session_modes (
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  mode_slug   text NOT NULL REFERENCES session_modes(slug) ON DELETE CASCADE,
  PRIMARY KEY (exercise_id, mode_slug)
);

CREATE INDEX idx_exercise_session_modes_mode
  ON exercise_session_modes(mode_slug);
