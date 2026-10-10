-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Conditioning-Format-Gewichte je Sportgruppe (Spec 2026-10-10 §2):
-- Zwilling des geplanten sport_plane_weights. Gewichte steuern die
-- Format-Rotation der Conditioning-Sessions (extensiv/intensiv/rounds).

begin;
set local lock_timeout = '5s';

create type conditioning_format as enum ('extensive', 'intensive', 'rounds');

create table sport_conditioning_weights (
  group_name text not null,
  format conditioning_format not null,
  weight smallint not null check (weight between 0 and 100),
  created_at timestamptz not null default now(),
  primary key (group_name, format)
);

alter table sport_conditioning_weights enable row level security;
create policy "Authenticated users can view sport conditioning weights"
  on sport_conditioning_weights for select to authenticated using (true);

insert into sport_conditioning_weights (group_name, format, weight) values
  ('team_sports',   'extensive', 40), ('team_sports',   'intensive', 55), ('team_sports',   'rounds',  5),
  ('combat_sports', 'extensive', 25), ('combat_sports', 'intensive', 25), ('combat_sports', 'rounds', 50),
  ('racket_sports', 'extensive', 25), ('racket_sports', 'intensive', 45), ('racket_sports', 'rounds', 30),
  ('athletics',     'extensive', 50), ('athletics',     'intensive', 50), ('athletics',     'rounds',  0),
  ('endurance',     'extensive', 60), ('endurance',     'intensive', 40), ('endurance',     'rounds',  0),
  ('strength',      'extensive', 40), ('strength',      'intensive', 60), ('strength',      'rounds',  0),
  ('other',         'extensive', 40), ('other',         'intensive', 50), ('other',         'rounds', 10)
on conflict (group_name, format) do nothing;

commit;
