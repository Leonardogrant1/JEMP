-- Abschluss des Übungs-Cleanups (Rundumschlag-Report):
--   1. Fehlende Beschreibungen (de/en) für die 9 geladenen/fortgeschrittenen
--      Varianten nachtragen
--   2. Zwei bodyweight-Mobility-Drills aus den primary/secondary-Slots nehmen
--   3. Warm-up-Mobility-Drills für Einsteiger zugänglich machen (min_level)
-- Alles slug-basiert (prod-portierbar).

-- ── 1. Beschreibungen ──────────────────────────────────────────────────────
update exercises set description_i18n = coalesce(description_i18n, '{}'::jsonb) || '{
  "de": "Kontrolliertes, wirbelweises Vorbeugen mit Lang- oder Kurzhanteln bei gestreckten Beinen, dann segmentweise wieder aufrollen. Baut Belastbarkeit und Beweglichkeit der Wirbelsäule und der hinteren Kette im End-Bereich auf.",
  "en": "Controlled vertebra-by-vertebra forward roll holding a barbell or dumbbells with straight legs, then reverse back up. Builds spinal and posterior-chain resilience and mobility at end range."
}'::jsonb where slug = 'jefferson_curl';

update exercises set description_i18n = coalesce(description_i18n, '{}'::jsonb) || '{
  "de": "Tiefer Split Squat mit Kurzhanteln, bei dem das vordere Knie weit über die Zehen wandert. Kräftigt Quadrizeps und Knie über die volle Bewegungsamplitude unter Last.",
  "en": "Deep split squat holding dumbbells with the front knee traveling far past the toes. Strengthens the quads and knees through a full range of motion under load."
}'::jsonb where slug = 'loaded_atg_split_squat';

update exercises set description_i18n = coalesce(description_i18n, '{}'::jsonb) || '{
  "de": "Seitliche Kniebeuge mit Kurzhantel, tief über ein gebeugtes Bein bei gestrecktem anderen. Kräftigt Beine und Adduktoren und verbessert die seitliche Beweglichkeit unter Last.",
  "en": "Lateral squat holding a dumbbell, sinking deep over one bent leg while the other stays extended. Strengthens the legs and adductors and improves lateral mobility under load."
}'::jsonb where slug = 'loaded_cossack_squat';

update exercises set description_i18n = coalesce(description_i18n, '{}'::jsonb) || '{
  "de": "Tiefer Ausfallschritt mit Kurzhantel und Rotation des Oberkörpers zur vorderen Seite. Öffnet Hüfte und Brustwirbelsäule und baut Rumpfstabilität unter Last auf.",
  "en": "Deep lunge holding a dumbbell with a torso rotation toward the front leg. Opens the hips and thoracic spine and builds trunk stability under load."
}'::jsonb where slug = 'loaded_deep_lunge_rotation';

update exercises set description_i18n = coalesce(description_i18n, '{}'::jsonb) || '{
  "de": "Gehaltene tiefe Hocke mit Zusatzgewicht, flache Füße und aufrechter Oberkörper. Baut Mobilität und Kraft in der tiefen Endposition unter Last auf.",
  "en": "Weighted hold at the bottom of a deep squat with flat feet and an upright torso. Builds mobility and strength in the deep end position under load."
}'::jsonb where slug = 'loaded_deep_squat_hold';

update exercises set description_i18n = coalesce(description_i18n, '{}'::jsonb) || '{
  "de": "Hüftbeuge mit Langhantel auf dem oberen Rücken: mit geradem Rücken vorbeugen, bis die hintere Oberschenkelmuskulatur spannt, dann über die Hüfte aufrichten. Kräftigt hintere Kette und unteren Rücken.",
  "en": "Hip hinge with a barbell across the upper back: fold forward with a flat back until the hamstrings load, then drive the hips to stand tall. Strengthens the posterior chain and lower back."
}'::jsonb where slug = 'loaded_good_morning';

update exercises set description_i18n = coalesce(description_i18n, '{}'::jsonb) || '{
  "de": "Tiefe Kniebeuge mit der Langhantel gestreckt über dem Kopf. Fordert Ganzkörper-Stabilität, Schulter- und Hüftmobilität und schult eine saubere Überkopf-Position unter Last.",
  "en": "Deep squat with a barbell locked out overhead. Demands full-body stability, shoulder and hip mobility, and grooves a strong overhead position under load."
}'::jsonb where slug = 'overhead_squat_loaded';

update exercises set description_i18n = coalesce(description_i18n, '{}'::jsonb) || '{
  "de": "Kontrollierte Hüftkreise (CARs) gegen den Zug eines Widerstandsbands durch die volle Bewegungsamplitude. Verbessert aktive Hüftbeweglichkeit und Gelenkkontrolle unter Widerstand.",
  "en": "Controlled articular rotations of the hip against band resistance through the full range of motion. Improves active hip mobility and joint control under resistance."
}'::jsonb where slug = 'resisted_hip_cars';

update exercises set description_i18n = coalesce(description_i18n, '{}'::jsonb) || '{
  "de": "Überkopfdrücken der Langhantel aus der tiefen Hocke heraus. Verlangt extreme Schulter-, Brustwirbel- und Hüftmobilität und kräftigt die Überkopf-Position in maximaler Tiefe.",
  "en": "Overhead barbell press performed from the bottom of a deep squat. Demands extreme shoulder, thoracic, and hip mobility while strengthening the overhead position at full depth."
}'::jsonb where slug = 'sots_press';

-- ── 2. Block-Typen: bodyweight-Mobility-Drills aus primary/secondary raus ───
-- Die geladenen Varianten (Hantel) füllen die Kraft-Slots; die bodyweight-
-- Version ist Zusatz-/Prep-Arbeit.
do $$
declare
  s text;
  ex_id uuid;
begin
  foreach s in array array['atg_split_squat', 'bodyweight_good_morning'] loop
    select id into ex_id from exercises where slug = s;
    if ex_id is null then continue; end if;
    delete from exercise_blocks where exercise_id = ex_id;
    insert into exercise_blocks (exercise_id, block_type_id)
    select ex_id, id from block_types where slug in ('accessory', 'warmup');
  end loop;
end $$;

-- ── 3. Warm-up-Mobility-Drills für Einsteiger zugänglich ───────────────────
-- Ein Mobility-Warmup, der Beweglichkeit erst aufbaut, muss auch für Anfänger
-- auswählbar sein — min_level 20 sperrte sie aus den Einsteiger-Warmups aus.
update exercises set min_level = 1
where slug in ('dowel_overhead_squat', 'tempo_hip_cars');
