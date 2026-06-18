-- supabase/migrations/20260618200000_add_plan_generation_jobs.sql

CREATE TABLE plan_generation_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id   text,
  status        text NOT NULL DEFAULT 'pending',
  -- 'pending' | 'planning_week' | 'generating_session' | 'saving' | 'completed' | 'error'
  phase_detail  text,   -- e.g. "2/4" when status='generating_session'
  error         text,
  plan_id       uuid REFERENCES workout_plans(id),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX plan_generation_jobs_user_id_idx ON plan_generation_jobs(user_id);
CREATE INDEX plan_generation_jobs_status_idx ON plan_generation_jobs(status)
  WHERE status NOT IN ('completed', 'error');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_plan_generation_jobs_updated_at
  BEFORE UPDATE ON plan_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: users can only read their own jobs
ALTER TABLE plan_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own jobs"
  ON plan_generation_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Enable Realtime for this table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE plan_generation_jobs;
  END IF;
END;
$$;
