-- Batch-Fix für Übungen ohne Environments (nie auswählbar) + Fehltaggungen bei
-- Block-Typen und fehlende Beschreibungen. Alles slug-basiert (prod-portierbar).
do $$
declare
  all_slugs text[] := array[
    'wall_handstand_push_up', 'sumo_squat_body_weight', 'deep_squat_hold',
    'atg_split_squat', 'bodyweight_good_morning', 'cossack_squat',
    'deep_lunge_rotation', 'segmental_spinal_roll', 'tempo_hip_cars'
  ];
  -- Reine Mobility-/Isometrie-Drills → nur warmup
  warmup_only_slugs text[] := array[
    'deep_squat_hold', 'cossack_squat', 'deep_lunge_rotation',
    'segmental_spinal_roll', 'tempo_hip_cars'
  ];
  s text;
  ex_id uuid;
begin
  -- 1. Environments (gym/home/outdoor) für ALLE — sonst nie auswählbar
  foreach s in array all_slugs loop
    select id into ex_id from exercises where slug = s;
    if ex_id is null then
      raise notice '% nicht gefunden — übersprungen', s;
      continue;
    end if;
    delete from exercise_environments where exercise_id = ex_id;
    insert into exercise_environments (exercise_id, environment_id)
    select ex_id, id from environments where slug in ('gym', 'home', 'outdoor');
  end loop;

  -- 2. Block-Typen: Mobility-/Isometrie-Drills auf warmup reduzieren
  foreach s in array warmup_only_slugs loop
    select id into ex_id from exercises where slug = s;
    if ex_id is null then continue; end if;
    delete from exercise_blocks where exercise_id = ex_id;
    insert into exercise_blocks (exercise_id, block_type_id)
    select ex_id, id from block_types where slug = 'warmup';
  end loop;

  -- 3. sumo_squat_body_weight hatte GAR KEINE Block-Typen → Kraft-Blöcke ergänzen
  select id into ex_id from exercises where slug = 'sumo_squat_body_weight';
  if ex_id is not null then
    delete from exercise_blocks where exercise_id = ex_id;
    insert into exercise_blocks (exercise_id, block_type_id)
    select ex_id, id from block_types where slug in ('primary', 'secondary', 'accessory');
  end if;
end $$;

-- 4. Fehlende Beschreibungen (de/en) — Muster + Trainingseffekt, zwei Sätze
update exercises set description_i18n = coalesce(description_i18n, '{}'::jsonb) || '{
  "de": "Passives Verharren in der tiefen Hocke mit flachen Füßen und aufrechtem Oberkörper. Öffnet Hüfte, Knie und Sprunggelenke und baut die Grundmobilität für tiefe Kniebeugen auf.",
  "en": "Passive hold at the bottom of a deep squat with flat feet and an upright torso. Opens the hips, knees, and ankles and builds the baseline mobility for deep squatting."
}'::jsonb where slug = 'deep_squat_hold';

update exercises set description_i18n = coalesce(description_i18n, '{}'::jsonb) || '{
  "de": "Seitliche Kniebeuge, bei der du dich tief über ein gebeugtes Bein absenkst, während das andere gestreckt bleibt. Mobilisiert Hüfte und Adduktoren und verbessert die seitliche Beweglichkeit.",
  "en": "Lateral squat lowering deep over one bent leg while the other stays extended. Mobilizes the hips and adductors and improves side-to-side range of motion."
}'::jsonb where slug = 'cossack_squat';

update exercises set description_i18n = coalesce(description_i18n, '{}'::jsonb) || '{
  "de": "Tiefer Ausfallschritt mit Rotation des Oberkörpers zur vorderen Seite. Öffnet Hüftbeuger und Brustwirbelsäule und bereitet den Körper auf dynamische Bewegungen vor.",
  "en": "Deep lunge with a torso rotation toward the front leg. Opens the hip flexors and thoracic spine and preps the body for dynamic movement."
}'::jsonb where slug = 'deep_lunge_rotation';

update exercises set description_i18n = coalesce(description_i18n, '{}'::jsonb) || '{
  "de": "Kontrolliertes Wirbel-für-Wirbel-Ab- und Aufrollen der Wirbelsäule. Verbessert die segmentale Beweglichkeit des Rückens und löst Verspannungen.",
  "en": "Controlled vertebra-by-vertebra roll down and back up through the spine. Improves segmental mobility of the back and releases tension."
}'::jsonb where slug = 'segmental_spinal_roll';

update exercises set description_i18n = coalesce(description_i18n, '{}'::jsonb) || '{
  "de": "Kontrollierte Hüftkreise (CARs) im langsamen Tempo durch die volle Bewegungsamplitude. Verbessert aktive Hüftbeweglichkeit und Gelenkkontrolle.",
  "en": "Controlled articular rotations of the hip performed slowly through the full range of motion. Improves active hip mobility and joint control."
}'::jsonb where slug = 'tempo_hip_cars';

-- sumo_squat_body_weight hatte nur eine englische Beschreibung → deutsche ergänzen
update exercises set description_i18n = coalesce(description_i18n, '{}'::jsonb) || '{
  "de": "Kniebeuge im breiten Stand mit nach außen zeigenden Füßen und aufrechtem Oberkörper. Trainiert Gesäß und Oberschenkelinnenseite über die volle Tiefe."
}'::jsonb where slug = 'sumo_squat_body_weight';
