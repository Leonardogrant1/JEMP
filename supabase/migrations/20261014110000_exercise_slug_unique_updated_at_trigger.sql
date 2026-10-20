-- Fundament für die Exercise-Sync-Scripts (pull/push, 14.10.):
--
-- 1. Unique-Index auf slug: Das gesamte Sync- und Migrations-Matching läuft
--    über Slugs. Ohne Constraint legte eine Migration mit vergessenem
--    where-not-exists-Guard stillschweigend Duplikate an (gab es auf Prod
--    bereits — Duplikat-Merges Sept/Okt). Jetzt knallt es beim db push.
--
-- 2. updated_at-Trigger: bisher pflegte nur das Admin-UI den Timestamp
--    manuell; direkte SQL-Edits blieben unsichtbar für die Sync-Konflikt-
--    logik. Bewusst KEIN moddatetime: der würde auch explizit gesetzte
--    Timestamps überschreiben — die Sync-Scripts schreiben updated_at
--    verbatim (Quelle behält Autorität). Die Funktion bumpt nur, wenn das
--    Statement updated_at NICHT selbst ändert.

begin;
set local lock_timeout = '5s';

create unique index if not exists exercises_slug_key on exercises (slug);

create or replace function set_exercises_updated_at() returns trigger as $$
begin
  if new.updated_at is not distinct from old.updated_at then
    new.updated_at = now();
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists exercises_set_updated_at on exercises;
create trigger exercises_set_updated_at
  before update on exercises
  for each row execute function set_exercises_updated_at();

commit;
