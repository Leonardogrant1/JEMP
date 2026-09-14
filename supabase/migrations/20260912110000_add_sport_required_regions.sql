-- Sport-Pflicht-Regionen (12.09.): "Athletic Floor" — Muskelregionen, die pro
-- Sportart direkt trainiert werden MÜSSEN (Leistungslimitierung /
-- Verletzungsprophylaxe), z.B. Adduktoren bei Fußball (Leistenprobleme sind
-- dort eine der häufigsten Ausfallursachen). Der Generator validiert, dass
-- jede Region über die Woche mindestens eine gewählte Übung bekommt.
-- Der Rest läuft bewusst indirekt über Verbundübungen mit (kein Bodybuilding-
-- Anspruch). Analog zu sport_category_relevance aufgebaut.
--
-- Bewusst NICHT enthalten: neck (Katalog hat nur Stretches, keine Kräftigung —
-- nachziehen, wenn Übungen existieren), ankle/forearm (Katalog zu dünn).

create table if not exists sport_required_regions (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references sports(id) on delete cascade,
  body_region body_region not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sport_id, body_region)
);

alter table sport_required_regions enable row level security;

do $$ begin
  create policy "Authenticated users can view sport required regions"
    on sport_required_regions for select to authenticated using (true);
exception when duplicate_object then null; end $$;

-- Basis für ALLE Sportarten: die großen Antriebs- und Stabilitätsgruppen
insert into sport_required_regions (sport_id, body_region)
select s.id, r.region::body_region
from sports s
cross join (values ('quad'), ('hamstring'), ('glute'), ('core')) as r(region)
where not exists (
  select 1 from sport_required_regions x
  where x.sport_id = s.id and x.body_region = r.region::body_region
);

-- Sportspezifische Ergänzungen
insert into sport_required_regions (sport_id, body_region)
select s.id, v.region::body_region
from (values
  -- Team-Sport: Richtungswechsel/Schuss → Adduktoren; Sprints/Sprünge → Waden
  ('soccer', 'groin'), ('soccer', 'calf'),
  ('football', 'groin'), ('football', 'upper_back'),
  ('hockey', 'groin'), ('hockey', 'calf'),
  ('handball', 'groin'), ('handball', 'shoulder'),
  ('rugby', 'upper_back'), ('rugby', 'groin'),
  ('basketball', 'calf'),
  ('volleyball', 'calf'), ('volleyball', 'shoulder'),
  -- Racket: Ausfallschritte seitlich + Überkopf-Schläge
  ('tennis', 'groin'), ('tennis', 'shoulder'),
  ('badminton', 'groin'), ('badminton', 'shoulder'),
  ('squash', 'groin'), ('squash', 'shoulder'),
  -- Kampfsport: Schlag-/Zugkraft, Nacken folgt sobald Katalog Kräftigung hat
  ('boxing', 'shoulder'), ('boxing', 'upper_back'),
  ('kickboxing', 'shoulder'), ('kickboxing', 'upper_back'),
  ('mma', 'shoulder'), ('mma', 'upper_back'),
  ('karate', 'shoulder'), ('karate', 'upper_back'),
  ('taekwondo', 'shoulder'), ('taekwondo', 'groin'),
  ('bjj', 'upper_back'), ('bjj', 'bicep'),
  ('judo', 'upper_back'), ('judo', 'bicep'),
  ('wrestling', 'upper_back'), ('wrestling', 'bicep'),
  -- Athletics
  ('sprinting', 'calf'),
  ('jumping', 'calf'),
  ('throwing', 'shoulder'), ('throwing', 'upper_back'),
  -- Endurance
  ('running', 'calf'),
  ('triathlon', 'calf'), ('triathlon', 'shoulder'),
  ('swimming', 'shoulder'), ('swimming', 'upper_back'),
  -- Other
  ('climbing', 'upper_back'), ('climbing', 'bicep'),
  ('gymnastics', 'shoulder'), ('gymnastics', 'upper_back'),
  -- Strength-Gruppe: hier IST direkte Abdeckung der Anspruch
  ('powerlifting', 'chest'), ('powerlifting', 'upper_back'), ('powerlifting', 'shoulder'),
  ('weightlifting', 'upper_back'), ('weightlifting', 'shoulder'),
  ('crossfit', 'chest'), ('crossfit', 'upper_back'), ('crossfit', 'shoulder'),
  ('bodybuilding', 'chest'), ('bodybuilding', 'upper_back'), ('bodybuilding', 'shoulder'),
  ('bodybuilding', 'bicep'), ('bodybuilding', 'tricep'), ('bodybuilding', 'calf')
) as v(sport_slug, region)
join sports s on s.slug = v.sport_slug
where not exists (
  select 1 from sport_required_regions x
  where x.sport_id = s.id and x.body_region = v.region::body_region
);
