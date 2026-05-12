CREATE TABLE session_modes (
  slug                 text PRIMARY KEY,
  display_name_i18n    jsonb NOT NULL DEFAULT '{}'::jsonb,
  description_i18n     jsonb NOT NULL DEFAULT '{}'::jsonb,
  typical_duration_min integer,
  typical_duration_max integer
);

INSERT INTO session_modes (slug, display_name_i18n, description_i18n, typical_duration_min, typical_duration_max) VALUES
  ('full',       '{"en": "Full Session",    "de": "Full Session"}',    '{"en": "Complete training session",  "de": "Vollständige Session"}', 60, 90),
  ('reduced',    '{"en": "Reduced Session", "de": "Reduced Session"}', '{"en": "Reduced training session",   "de": "Reduzierte Session"}',   45, 60),
  ('activation', '{"en": "Activation",      "de": "Aktivierung"}',     '{"en": "Short activation",           "de": "Kurze Aktivierung"}',    20, 30),
  ('recovery',   '{"en": "Recovery",        "de": "Recovery"}',        '{"en": "Recovery session",           "de": "Recovery-Session"}',     15, 25);
