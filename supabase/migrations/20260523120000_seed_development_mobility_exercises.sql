-- ─────────────────────────────────────────────────────────────────────────────
-- Development Mobility Exercises
--
-- Diese Übungen sind AKTIVE Entwicklungs-Mobility (primary/secondary/accessory),
-- NICHT Warmup/Cooldown (das sind restorative/breathing exercises).
--
-- exercise_type = 'dynamic'  →  erscheinen in full/reduced/activation-Modi
-- intensity_score 3–6        →  je nach Belastung und Load
--
-- Konzept: 8 loaded/unloaded-Paare + 2 Solo-Übungen = 18 Übungen
-- Bodyweight-Varianten: keine Equipment- oder Environment-Zeile → überall verfügbar
-- Loaded Varianten:     Equipment-Mapping + Environment gym (barbell/dumbbell)
--                       bzw. gym+home (resistance_band)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── EXERCISES ───────────────────────────────────────────────────────────────

INSERT INTO exercises (
  name, slug, description,
  movement_pattern, body_region, category_id,
  min_level, max_level,
  exercise_type, intensity_score
) VALUES

  -- ── COSSACK SQUAT ──────────────────────────────────────────────────────────
  ('Cossack Squat', 'cossack_squat',
   'Deep lateral squat shifting side to side. Develops active hip and adductor range. Bodyweight version for any setting.',
   'mobility', 'groin',
   (SELECT id FROM categories WHERE slug = 'mobility'),
   15, 100, 'dynamic', 4),

  ('Loaded Cossack Squat', 'loaded_cossack_squat',
   'Cossack squat holding a dumbbell at the chest for progressive overload of end-range hip and adductor strength.',
   'mobility', 'groin',
   (SELECT id FROM categories WHERE slug = 'mobility'),
   30, 100, 'dynamic', 5),

  -- ── ATG SPLIT SQUAT ────────────────────────────────────────────────────────
  ('ATG Split Squat', 'atg_split_squat',
   'Knees-over-toes split squat through deep flexion. Bodyweight for knee and ankle range development.',
   'mobility', 'quad',
   (SELECT id FROM categories WHERE slug = 'mobility'),
   20, 100, 'dynamic', 4),

  ('Loaded ATG Split Squat', 'loaded_atg_split_squat',
   'ATG split squat holding dumbbells to build strength through deep knee and ankle range.',
   'mobility', 'quad',
   (SELECT id FROM categories WHERE slug = 'mobility'),
   40, 100, 'dynamic', 5),

  -- ── DEEP SQUAT HOLD ────────────────────────────────────────────────────────
  ('Deep Squat Hold', 'deep_squat_hold',
   'Active hold in deep squat position. Bodyweight version to develop usable deep hip and ankle range.',
   'isometric', 'hip',
   (SELECT id FROM categories WHERE slug = 'mobility'),
   1, 100, 'dynamic', 3),

  ('Loaded Deep Squat Hold', 'loaded_deep_squat_hold',
   'Deep squat hold with goblet load to develop deep range under tension.',
   'isometric', 'hip',
   (SELECT id FROM categories WHERE slug = 'mobility'),
   20, 100, 'dynamic', 4),

  -- ── GOOD MORNING ───────────────────────────────────────────────────────────
  ('Bodyweight Good Morning', 'bodyweight_good_morning',
   'Standing hip hinge with hands behind head to develop active hamstring and posterior chain range. No equipment needed.',
   'mobility', 'hamstring',
   (SELECT id FROM categories WHERE slug = 'mobility'),
   1, 100, 'dynamic', 4),

  ('Loaded Good Morning', 'loaded_good_morning',
   'Hip hinge with light barbell to develop active hamstring and posterior range under load.',
   'mobility', 'hamstring',
   (SELECT id FROM categories WHERE slug = 'mobility'),
   30, 100, 'dynamic', 5),

  -- ── JEFFERSON CURL ─────────────────────────────────────────────────────────
  ('Segmental Spinal Roll', 'segmental_spinal_roll',
   'Slow bodyweight standing roll-down and up, articulating the spine segment by segment. Unloaded precursor to the Jefferson Curl.',
   'mobility', 'thoracic',
   (SELECT id FROM categories WHERE slug = 'mobility'),
   15, 100, 'dynamic', 3),

  ('Jefferson Curl', 'jefferson_curl',
   'Loaded progressive spinal flexion from standing with light weight. Develops active end-range control through the full spine.',
   'mobility', 'thoracic',
   (SELECT id FROM categories WHERE slug = 'mobility'),
   30, 100, 'dynamic', 5),

  -- ── HIP CARs ───────────────────────────────────────────────────────────────
  ('Tempo Hip CARs', 'tempo_hip_cars',
   'Controlled articular rotations of the hip at slow tempo through maximal active range. Bodyweight development version, not a warmup.',
   'mobility', 'hip',
   (SELECT id FROM categories WHERE slug = 'mobility'),
   20, 100, 'dynamic', 4),

  ('Resisted Hip CARs', 'resisted_hip_cars',
   'Hip CARs against band resistance at end range to build active control under load.',
   'mobility', 'hip',
   (SELECT id FROM categories WHERE slug = 'mobility'),
   30, 100, 'dynamic', 5),

  -- ── DEEP LUNGE WITH ROTATION ───────────────────────────────────────────────
  ('Deep Lunge with Rotation', 'deep_lunge_rotation',
   'Deep lunge combined with thoracic rotation to develop active hip flexor length and rotational range. Bodyweight.',
   'mobility', 'hip',
   (SELECT id FROM categories WHERE slug = 'mobility'),
   15, 100, 'dynamic', 4),

  ('Loaded Deep Lunge with Rotation', 'loaded_deep_lunge_rotation',
   'Deep lunge with rotation holding a light plate or dumbbell for added range demand and control.',
   'mobility', 'hip',
   (SELECT id FROM categories WHERE slug = 'mobility'),
   30, 100, 'dynamic', 5),

  -- ── OVERHEAD SQUAT ─────────────────────────────────────────────────────────
  ('Dowel Overhead Squat', 'dowel_overhead_squat',
   'Overhead squat with a dowel or broomstick to develop shoulder, thoracic, hip and ankle mobility without load. No equipment needed.',
   'mobility', 'full_body',
   (SELECT id FROM categories WHERE slug = 'mobility'),
   20, 100, 'dynamic', 4),

  ('Overhead Squat (Loaded)', 'overhead_squat_loaded',
   'Light barbell overhead squat emphasizing full-body mobility under load as the primary stimulus.',
   'mobility', 'full_body',
   (SELECT id FROM categories WHERE slug = 'mobility'),
   40, 100, 'dynamic', 6),

  -- ── SOLO EXERCISES ─────────────────────────────────────────────────────────
  ('Hip Flexion Lift-Off', 'hip_flexion_lift_off',
   'Active lifting of the leg from passive end range to build strength in available hip flexion ROM. Bodyweight or banded.',
   'mobility', 'hip',
   (SELECT id FROM categories WHERE slug = 'mobility'),
   30, 100, 'dynamic', 4),

  ('Sots Press', 'sots_press',
   'Overhead press from a deep squat position. Extreme demand on thoracic, shoulder, hip and ankle mobility under load.',
   'mobility', 'shoulder',
   (SELECT id FROM categories WHERE slug = 'mobility'),
   50, 100, 'dynamic', 6)

;

-- ─── EQUIPMENT MAPPINGS ───────────────────────────────────────────────────────
-- Nur loaded-Varianten erhalten Equipment-Zeilen.
-- Bodyweight-Varianten haben keine Zeilen → passesEquipmentAndEnv lässt sie überall durch.

INSERT INTO exercise_equipments (exercise_id, equipment_id)
SELECT ex.id, eq.id
FROM exercises ex
JOIN equipments eq ON (
  (ex.slug = 'loaded_cossack_squat'        AND eq.slug = 'dumbbell')    OR
  (ex.slug = 'loaded_atg_split_squat'      AND eq.slug = 'dumbbell')    OR
  (ex.slug = 'loaded_deep_squat_hold'      AND eq.slug = 'dumbbell')    OR
  (ex.slug = 'loaded_good_morning'         AND eq.slug = 'barbell')     OR
  (ex.slug = 'jefferson_curl'              AND eq.slug = 'dumbbell')    OR
  (ex.slug = 'jefferson_curl'              AND eq.slug = 'barbell')     OR
  (ex.slug = 'resisted_hip_cars'           AND eq.slug = 'resistance_band') OR
  (ex.slug = 'loaded_deep_lunge_rotation'  AND eq.slug = 'dumbbell')    OR
  (ex.slug = 'overhead_squat_loaded'       AND eq.slug = 'barbell')     OR
  (ex.slug = 'sots_press'                  AND eq.slug = 'barbell')     OR
  (ex.slug = 'hip_flexion_lift_off'        AND eq.slug = 'resistance_band')
);

-- ─── ENVIRONMENT MAPPINGS ─────────────────────────────────────────────────────
-- Bodyweight-Varianten: keine Zeilen → überall verfügbar (home, gym, outdoor)
-- Barbell/Dumbbell:     gym only
-- Resistance Band:      gym + home
-- dowel_overhead_squat: keine Zeilen (Besenstiel = kein echtes Equipment)

INSERT INTO exercise_environments (exercise_id, environment_id)
SELECT ex.id, env.id
FROM exercises ex
JOIN environments env ON (
  -- Barbell → gym only
  (ex.slug IN ('loaded_good_morning', 'overhead_squat_loaded', 'sots_press')
    AND env.slug = 'gym')

  OR

  -- Dumbbell → gym only
  (ex.slug IN ('loaded_cossack_squat', 'loaded_atg_split_squat', 'loaded_deep_squat_hold',
               'jefferson_curl', 'loaded_deep_lunge_rotation')
    AND env.slug = 'gym')

  OR

  -- Resistance band → gym + home
  (ex.slug IN ('resisted_hip_cars', 'hip_flexion_lift_off')
    AND env.slug IN ('gym', 'home'))
)
ON CONFLICT DO NOTHING;

-- ─── BLOCK TYPE MAPPINGS ─────────────────────────────────────────────────────
-- Alle 18 Übungen → primary, secondary, accessory
-- (Development Mobility ist kein Warmup/Cooldown — das sind restorative-Übungen)
--
-- Ausnahme: 7 niedrigschwellige Bodyweight-Übungen erhalten zusätzlich warmup,
-- weil sie als aktive Bewegungsvorbereitung taugen.

INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id
FROM exercises ex
JOIN block_types bt ON bt.slug IN ('primary', 'secondary', 'accessory')
WHERE ex.slug IN (
  'cossack_squat', 'loaded_cossack_squat',
  'atg_split_squat', 'loaded_atg_split_squat',
  'deep_squat_hold', 'loaded_deep_squat_hold',
  'bodyweight_good_morning', 'loaded_good_morning',
  'segmental_spinal_roll', 'jefferson_curl',
  'tempo_hip_cars', 'resisted_hip_cars',
  'deep_lunge_rotation', 'loaded_deep_lunge_rotation',
  'dowel_overhead_squat', 'overhead_squat_loaded',
  'hip_flexion_lift_off', 'sots_press'
);

-- Niedrigschwellige Bodyweight-Übungen auch als warmup
INSERT INTO exercise_blocks (exercise_id, block_type_id)
SELECT ex.id, bt.id
FROM exercises ex
JOIN block_types bt ON bt.slug = 'warmup'
WHERE ex.slug IN (
  'cossack_squat',
  'deep_squat_hold',
  'bodyweight_good_morning',
  'segmental_spinal_roll',
  'tempo_hip_cars',
  'deep_lunge_rotation',
  'dowel_overhead_squat'
);
