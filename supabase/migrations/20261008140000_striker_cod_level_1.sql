-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- COD als Erhaltungsreiz für Striker + MMA (User-Entscheid 08.10., QA-Befund):
-- der COD-Pool enthält Ladder-Drills/Lateral Shuffle — klassische Fußarbeit,
-- die Kämpfer trainieren. Stufe 1 = sichtbar ohne eigene Speed-Session.
-- Grappler (bjj/judo/wrestling) bleiben bewusst bei 0 (Matte, keine Laufwege).
-- Budget bleibt valide: Striker 7 sichtbar, Summe 11 ≤ 7+4.
UPDATE sport_category_relevance scr
SET relevance = 1
FROM sports s, categories c
WHERE scr.sport_id = s.id AND scr.category_id = c.id
  AND c.slug = 'cod' AND scr.relevance = 0
  AND s.slug IN ('boxing', 'kickboxing', 'karate', 'taekwondo', 'mma');
