insert into storage.buckets (id, name, public)
values ('exercises', 'exercises', true)
on conflict do nothing;
