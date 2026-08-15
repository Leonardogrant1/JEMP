-- Banner fallback per sport group: used when the individual sport has no banner.
-- sports.group_name is a plain text column, so group banners get their own table.
create table if not exists sport_group_banners (
    group_name text primary key,
    banner_storage_path text,
    updated_at timestamp with time zone default now()
);

alter table sport_group_banners enable row level security;

create policy "Authenticated users can view sport group banners"
    on sport_group_banners for select
    to authenticated
    using (true);
