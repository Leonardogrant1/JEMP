-- 16. Kontraindikations-Tag: griff-/unterarmbeuger-intensive Zug-Last
-- (Zug-Übungen, Hänge-Übungen, Carries, schwere Hinges, Curls, explosive Grip-Pulls).
-- Schließt die Taxonomie-Lücke für Unterarm-/Griff-Verletzungen, die von
-- wrist_extension_loaded (Streckseite/Stützposition) nicht abgedeckt ist.
-- Übungs-Zuordnungen sind Daten (Admin-Review + exercises:push), nicht Teil der Migration.
INSERT INTO contraindication_tags (slug) VALUES ('grip_pulling_loaded')
ON CONFLICT (slug) DO NOTHING;
