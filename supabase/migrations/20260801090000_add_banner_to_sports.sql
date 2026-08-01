-- Sport banner images, shown as the profile header background in the app.
ALTER TABLE sports ADD COLUMN IF NOT EXISTS banner_storage_path text;

-- Public bucket for sport banners (same pattern as the assessments bucket)
insert into storage.buckets (id, name, public)
values ('sport-banners', 'sport-banners', true)
on conflict do nothing;
