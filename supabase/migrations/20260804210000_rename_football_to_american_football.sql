-- "Football" ist mehrdeutig (vs. soccer/"Fußball") — der Sport heißt in beiden
-- Sprachen explizit "American Football", damit niemand durcheinanderkommt.
update sports
set name_i18n = name_i18n || '{"de": "American Football", "en": "American Football"}'::jsonb
where slug = 'football';
