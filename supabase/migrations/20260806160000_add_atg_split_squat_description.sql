-- Beschreibung für den ATG Split Squat (de/en) — Format wie bei den übrigen
-- Übungsbeschreibungen: kurz, zwei Sätze, Muster + Trainingseffekt.
update exercises
set description_i18n = coalesce(description_i18n, '{}'::jsonb) || '{
  "de": "Tiefer Split Squat, bei dem das vordere Knie weit über die Zehen wandert und die Hüfte fast bis zum Boden absinkt. Baut Kniestabilität, Sprunggelenks-Mobilität und Quadrizeps-Kraft über die volle Bewegungsamplitude auf.",
  "en": "Deep split squat where the front knee travels far past the toes and the hips sink close to the ground. Builds knee resilience, ankle mobility, and quad strength through a full range of motion."
}'::jsonb
where slug = 'atg_split_squat';
