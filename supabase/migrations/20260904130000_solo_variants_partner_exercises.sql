-- Zwei Übungen setzten (implizit bzw. explizit) einen Trainingspartner voraus —
-- die App kennt kein Partner-Konzept, Solo-User konnten sie nicht ausführen.
-- Beschreibungen auf die etablierten Solo-Varianten umgestellt (Wand-Pass bzw.
-- Self-Drop), Partner bleibt als Alternative erwähnt. Kein Gating: Upper-Plyo
-- ist die dünnste Kategorie, ein Partner-Equipment-Gate würde beide Übungen
-- für praktisch alle User aus den Pools entfernen.

UPDATE exercises SET description_i18n = '{
  "de": "Explosiver beidarmiger Brustpass gegen eine stabile Wand: Ball auf Brusthöhe kraftvoll wegdrücken, abprallen lassen und direkt wieder passen. Mit Trainingspartner alternativ als Partnerpass. Entwickelt horizontale Oberkörperdruckkraft.",
  "en": "Explosive two-arm chest pass against a sturdy wall: drive the ball away at chest height, let it rebound and pass again immediately. With a training partner, pass to them instead. Builds horizontal upper-body pushing power."
}'::jsonb
WHERE slug = 'med_ball_chest_pass';

UPDATE exercises SET description_i18n = '{
  "de": "Ball mit gestrecktem Arm auf Brusthöhe halten, selbst fallen lassen und vor dem zweiten Aufprall fangen — je tiefer der Fangpunkt, desto schwerer. Mit Trainingspartner alternativ: Partner lässt den Ball unangekündigt fallen. Trainiert Reaktionsgeschwindigkeit und Handschnelligkeit.",
  "en": "Hold the ball at chest height with an extended arm, release it and catch it before the second bounce — the lower the catch, the harder it gets. With a training partner: they drop the ball without warning. Trains reaction speed and hand quickness."
}'::jsonb
WHERE slug = 'reactive_drop_catch';
