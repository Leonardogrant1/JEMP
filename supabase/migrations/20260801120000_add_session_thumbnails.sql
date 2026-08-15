-- Remote session thumbnails per exercise image group, managed in the admin panel.
-- Falls back to the bundled stock images in the app when no row/path exists.
create table if not exists session_thumbnails (
    image_group text primary key,
    storage_path text,
    updated_at timestamp with time zone default now()
);

alter table session_thumbnails enable row level security;

create policy "Authenticated users can view session thumbnails"
    on session_thumbnails for select
    to authenticated
    using (true);

insert into storage.buckets (id, name, public)
values ('session-thumbnails', 'session-thumbnails', true)
on conflict do nothing;
