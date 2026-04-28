alter table user_profiles
  add column if not exists preferred_language text check (preferred_language in ('en', 'de'));
