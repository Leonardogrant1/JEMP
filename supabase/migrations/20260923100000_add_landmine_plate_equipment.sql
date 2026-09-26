-- Equipment-Drift (23.09.): landmine und plate wurden am 18.05. direkt über das
-- Prod-Admin angelegt und fehlen lokal. Als Migration nachgezogen (auf Prod
-- no-op), damit der Prod→Dev-Übungs-Sync Slug-identische Lookups vorfindet.

insert into equipments (slug, name_i18n)
select v.slug, v.name_i18n::jsonb
from (values
  ('landmine', '{"de": "Landmine", "en": "Landmine"}'),
  ('plate',    '{"de": "Platte", "en": "Plate"}')
) as v(slug, name_i18n)
where not exists (select 1 from equipments e where e.slug = v.slug);
