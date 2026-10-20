-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Bewegungsebenen-Gewichte je Sportgruppe UND Muster-Familie (Spec 2026-10-11
-- §1/§2): Zwilling von sport_conditioning_weights. Steuert, wie oft ein
-- normal-emphasis-Kraftmuster eine frontale/transversale Betonung bekommt.
-- 'sagittal' ist das Komplement ("kein Ebenen-Fokus"). Idempotent.

begin;
set local lock_timeout = '5s';

create table sport_plane_weights (
  group_name text not null,
  pattern text not null check (pattern in ('knee_dominant', 'hinge', 'push', 'pull')),
  plane movement_type not null,
  weight smallint not null check (weight between 0 and 100),
  created_at timestamptz not null default now(),
  primary key (group_name, pattern, plane)
);

alter table sport_plane_weights enable row level security;
create policy "Authenticated users can view sport plane weights"
  on sport_plane_weights for select to authenticated using (true);

-- Seeds (Spec §2, Review-korrigiert 11.10.): sagittal/frontal/transverse.
-- athletics sprint-ausgelegt (Werfer = bekannter Sonderfall via 'other'/spätere
-- Gruppe); combat hinge 60/10/30 setzt die Content-Migration (Task 2) voraus.
insert into sport_plane_weights (group_name, pattern, plane, weight)
select v.g, v.p, v.plane::movement_type, v.w
from (values
  ('combat_sports', 'knee_dominant', 'sagittal', 50), ('combat_sports', 'knee_dominant', 'frontal', 10), ('combat_sports', 'knee_dominant', 'transverse', 40),
  ('combat_sports', 'hinge',         'sagittal', 60), ('combat_sports', 'hinge',         'frontal', 10), ('combat_sports', 'hinge',         'transverse', 30),
  ('combat_sports', 'push',          'sagittal', 40), ('combat_sports', 'push',          'frontal',  0), ('combat_sports', 'push',          'transverse', 60),
  ('combat_sports', 'pull',          'sagittal', 60), ('combat_sports', 'pull',          'frontal',  0), ('combat_sports', 'pull',          'transverse', 40),
  ('team_sports',   'knee_dominant', 'sagittal', 50), ('team_sports',   'knee_dominant', 'frontal', 40), ('team_sports',   'knee_dominant', 'transverse', 10),
  ('team_sports',   'hinge',         'sagittal', 55), ('team_sports',   'hinge',         'frontal', 20), ('team_sports',   'hinge',         'transverse', 25),
  ('team_sports',   'push',          'sagittal', 75), ('team_sports',   'push',          'frontal',  0), ('team_sports',   'push',          'transverse', 25),
  ('team_sports',   'pull',          'sagittal', 80), ('team_sports',   'pull',          'frontal',  0), ('team_sports',   'pull',          'transverse', 20),
  ('racket_sports', 'knee_dominant', 'sagittal', 50), ('racket_sports', 'knee_dominant', 'frontal', 25), ('racket_sports', 'knee_dominant', 'transverse', 25),
  ('racket_sports', 'hinge',         'sagittal', 60), ('racket_sports', 'hinge',         'frontal', 10), ('racket_sports', 'hinge',         'transverse', 30),
  ('racket_sports', 'push',          'sagittal', 50), ('racket_sports', 'push',          'frontal',  0), ('racket_sports', 'push',          'transverse', 50),
  ('racket_sports', 'pull',          'sagittal', 60), ('racket_sports', 'pull',          'frontal',  0), ('racket_sports', 'pull',          'transverse', 40),
  ('athletics',     'knee_dominant', 'sagittal', 80), ('athletics',     'knee_dominant', 'frontal', 15), ('athletics',     'knee_dominant', 'transverse',  5),
  ('athletics',     'hinge',         'sagittal', 85), ('athletics',     'hinge',         'frontal', 10), ('athletics',     'hinge',         'transverse',  5),
  ('athletics',     'push',          'sagittal', 90), ('athletics',     'push',          'frontal',  0), ('athletics',     'push',          'transverse', 10),
  ('athletics',     'pull',          'sagittal', 90), ('athletics',     'pull',          'frontal',  0), ('athletics',     'pull',          'transverse', 10),
  ('endurance',     'knee_dominant', 'sagittal', 80), ('endurance',     'knee_dominant', 'frontal', 15), ('endurance',     'knee_dominant', 'transverse',  5),
  ('endurance',     'hinge',         'sagittal', 90), ('endurance',     'hinge',         'frontal',  5), ('endurance',     'hinge',         'transverse',  5),
  ('endurance',     'push',          'sagittal', 95), ('endurance',     'push',          'frontal',  0), ('endurance',     'push',          'transverse',  5),
  ('endurance',     'pull',          'sagittal', 95), ('endurance',     'pull',          'frontal',  0), ('endurance',     'pull',          'transverse',  5),
  ('strength',      'knee_dominant', 'sagittal', 85), ('strength',      'knee_dominant', 'frontal', 10), ('strength',      'knee_dominant', 'transverse',  5),
  ('strength',      'hinge',         'sagittal', 90), ('strength',      'hinge',         'frontal',  5), ('strength',      'hinge',         'transverse',  5),
  ('strength',      'push',          'sagittal', 90), ('strength',      'push',          'frontal',  0), ('strength',      'push',          'transverse', 10),
  ('strength',      'pull',          'sagittal', 90), ('strength',      'pull',          'frontal',  0), ('strength',      'pull',          'transverse', 10),
  ('other',         'knee_dominant', 'sagittal', 60), ('other',         'knee_dominant', 'frontal', 25), ('other',         'knee_dominant', 'transverse', 15),
  ('other',         'hinge',         'sagittal', 75), ('other',         'hinge',         'frontal', 15), ('other',         'hinge',         'transverse', 10),
  ('other',         'push',          'sagittal', 80), ('other',         'push',          'frontal',  0), ('other',         'push',          'transverse', 20),
  ('other',         'pull',          'sagittal', 80), ('other',         'pull',          'frontal',  0), ('other',         'pull',          'transverse', 20)
) as v(g, p, plane, w)
on conflict (group_name, pattern, plane) do nothing;

commit;
