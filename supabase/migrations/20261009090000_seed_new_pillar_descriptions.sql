-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Beschreibungen für die drei neuen Säulen (QA 09.10.): der Info-Dialog im
-- Prioritäten-Step zeigte rohe i18n-Keys, weil weder description_i18n noch
-- Locale-Fallbacks existierten. COALESCE: vorhandene Texte nie überschreiben.
UPDATE categories SET description_i18n = COALESCE(description_i18n, '{
  "de": "Antritt und Maximalgeschwindigkeit — lineare Schnelligkeit auf freier Strecke.",
  "en": "Acceleration and top speed — linear sprinting speed in open space."
}'::jsonb) WHERE slug = 'sprints';

UPDATE categories SET description_i18n = COALESCE(description_i18n, '{
  "de": "Richtungswechsel — abbremsen, umsteuern und wieder explosiv beschleunigen.",
  "en": "Change of direction — decelerate, redirect and re-accelerate explosively."
}'::jsonb) WHERE slug = 'cod';

UPDATE categories SET description_i18n = COALESCE(description_i18n, '{
  "de": "Ausdauer und Wiederholungsfähigkeit — frisch bleiben über die volle Spielzeit.",
  "en": "Conditioning and repeat-effort capacity — stay fresh for the full game."
}'::jsonb) WHERE slug = 'conditioning';
