-- Optional instructional videos for assessments.
-- In the UI an uploaded video (video_storage_path) takes priority over youtube_url.
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS youtube_url text;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS video_storage_path text;

-- Public bucket for assessment videos (same pattern as the exercises bucket)
insert into storage.buckets (id, name, public)
values ('assessments', 'assessments', true)
on conflict do nothing;
