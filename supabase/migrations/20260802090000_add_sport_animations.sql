-- Training-day Lottie animations per sport, with a group fallback —
-- same pattern as the sport banners.
alter table sports add column if not exists animation_storage_path text;

create table if not exists sport_group_animations (
    group_name text primary key,
    animation_storage_path text,
    updated_at timestamp with time zone default now()
);

alter table sport_group_animations enable row level security;

create policy "Authenticated users can view sport group animations"
    on sport_group_animations for select
    to authenticated
    using (true);

-- Public bucket for the Lottie JSON files (same pattern as sport-banners)
insert into storage.buckets (id, name, public)
values ('sport-animations', 'sport-animations', true)
on conflict do nothing;
