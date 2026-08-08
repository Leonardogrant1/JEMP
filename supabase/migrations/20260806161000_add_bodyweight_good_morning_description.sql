-- Beschreibung für den Bodyweight Good Morning (de/en) — Format wie bei den
-- übrigen Übungsbeschreibungen: kurz, zwei Sätze, Muster + Trainingseffekt.
update exercises
set description_i18n = coalesce(description_i18n, '{}'::jsonb) || '{
  "de": "Hüftbeuge ohne Zusatzgewicht: Mit geradem Rücken den Oberkörper nach vorn kippen, bis die Rückseite der Oberschenkel spannt, dann über die Hüfte wieder aufrichten. Schult das Hip-Hinge-Muster und kräftigt Beinbeuger, Gesäß und unteren Rücken.",
  "en": "Hip hinge with no added load: keeping a flat back, tip the torso forward until the hamstrings load up, then drive the hips through to stand tall. Teaches the hip-hinge pattern and strengthens the hamstrings, glutes, and lower back."
}'::jsonb
where slug = 'bodyweight_good_morning';
