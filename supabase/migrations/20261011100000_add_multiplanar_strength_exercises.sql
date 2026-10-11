-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Multiplanare Bein- & Rotationskraft (QA 11.10.): Die Bein-Kraftpools waren
-- 28/30 sagittal (knee_dominant 13:2:0, hinge 15:0:0 — sagittal:frontal:transversal),
-- rotationale Core-KRAFT bestand nur aus cable_chop + half_kneeling_kb_chops.
-- 6 Bein-Übungen (frontal/transversal, strength_pattern gesetzt → landen in den
-- Pattern-Pools, nie im Accessory-Pool) + 2 Core-Rotationen (core_type power,
-- Spiegelung von cable_chop). Ohne Video/Thumbnail (nachpflegen). Idempotent.

begin;
set local lock_timeout = '5s';

insert into exercises (name, slug, category_id, body_region, movement_pattern, strength_pattern, core_type,
  min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, movement_type,
  is_explosive, image_group, description_i18n)
select v.name, v.slug, c.id, v.region::body_region, v.pattern::movement_pattern,
  v.strength_pattern::strength_pattern, v.core_type::core_type,
  v.min_level, 100, v.intensity, 'dynamic', v.measurement, 'unilateral'::laterality,
  v.movement_type::movement_type, false, v.image_group::exercise_image_group, v.descr::jsonb
from (values
  -- ── Beine, frontal (knee_dominant) ─────────────────────────────────────────
  ('Lateral Lunge', 'lateral_lunge', 'quad', 'legs', 'knee_dominant', null, 10, 4, 'reps', 'frontal', 'squat_patterns',
   '{"de": "Großer Schritt zur Seite, Hüfte nach hinten, Knie über der Fußspitze — das andere Bein bleibt gestreckt. Kraft und Kontrolle in der Seitwärtsbewegung, die Basis für Richtungswechsel.", "en": "Big step to the side, hips back, knee tracking over the toes — the other leg stays straight. Strength and control moving laterally, the base for change of direction."}'),
  ('Loaded Lateral Lunge', 'loaded_lateral_lunge', 'quad', 'legs', 'knee_dominant', null, 25, 6, 'reps', 'frontal', 'squat_patterns',
   '{"de": "Lateral Lunge mit Kurzhantel oder Kettlebell vor der Brust (Goblet). Die Last zwingt den Rumpf aufrecht und macht die seitliche Beinkraft progressiv belastbar.", "en": "Lateral lunge holding a dumbbell or kettlebell at the chest (goblet). The load keeps the torso tall and lets you progressively overload lateral leg strength."}'),
  ('Lateral Step-Up', 'lateral_step_up', 'quad', 'legs', 'knee_dominant', null, 15, 5, 'reps', 'frontal', 'squat_patterns',
   '{"de": "Seitlich neben Box oder Bank: seitlich aufsteigen, komplett strecken, kontrolliert absenken. Einbeinige Kraft in der Frontalebene — ohne Schwung aus dem unteren Bein.", "en": "Standing side-on to a box or bench: step up laterally, extend fully, lower under control. Single-leg strength in the frontal plane — no push-off from the bottom leg."}'),
  -- ── Beine, transversal (knee_dominant / hinge) ──────────────────────────────
  ('Split Squat with Rotation', 'kb_split_squat_rotation', 'quad', 'legs', 'knee_dominant', null, 25, 6, 'reps', 'transverse', 'squat_patterns',
   '{"de": "Split Squat mit Kettlebell oder Kurzhantel vor der Brust: in der tiefen Position den Oberkörper über das vordere Bein rotieren, zurückdrehen, hochdrücken. Beinkraft plus Rotationskontrolle — wie im Sport.", "en": "Split squat holding a kettlebell or dumbbell at the chest: in the bottom position rotate the torso over the front leg, return, drive up. Leg strength plus rotational control — like in sport."}'),
  ('Curtsy Lunge', 'curtsy_lunge', 'glute', 'legs', 'knee_dominant', null, 15, 4, 'reps', 'transverse', 'squat_patterns',
   '{"de": "Ausfallschritt schräg hinter das Standbein (wie ein Knicks). Belastet Gesäß und Hüfte in Rotation und Adduktion — Stabilität für Schnitte und Drehungen.", "en": "Lunge diagonally behind the stance leg (like a curtsy). Loads the glutes and hip in rotation and adduction — stability for cuts and turns."}'),
  ('Rotational Single-Leg RDL', 'rotational_single_leg_rdl', 'hamstring', 'pull', 'hinge', null, 30, 5, 'reps', 'transverse', 'hip_hinge',
   '{"de": "Einbeiniges Kreuzheben mit Kurzhantel oder Kettlebell: in der Hüftbeuge kontrolliert zur Standbeinseite rotieren und zurück. Hintere Kette plus Rotationsstabilität der Hüfte.", "en": "Single-leg RDL with a dumbbell or kettlebell: at the bottom of the hinge, rotate under control toward the stance-leg side and back. Posterior chain plus rotational hip stability."}'),
  -- ── Core-Rotationskraft (Spiegelung cable_chop: core_type power) ────────────
  ('Landmine Rotation', 'landmine_rotation', 'obliques', 'core', null, 'power', 20, 6, 'reps', 'transverse', 'conditioning',
   '{"de": "Langhantel in der Landmine, Endstück mit gestreckten Armen vor der Brust: kontrolliert von Seite zu Seite rotieren, Hüfte dreht mit. Schwere, geführte Rumpfrotation — der Kraftaufbau hinter jedem Schlag und Wurf.", "en": "Barbell in the landmine, holding the end with straight arms at chest height: rotate side to side under control, hips turning with you. Heavy, guided trunk rotation — the strength behind every punch and throw."}'),
  ('Standing Cable Rotation', 'standing_cable_rotation', 'obliques', 'core', null, 'power', 10, 5, 'reps_or_duration', 'transverse', 'conditioning',
   '{"de": "Kabelzug auf Brusthöhe, Arme gestreckt: Rumpf gegen den Zug von der Maschine wegrotieren, langsam zurück. Rotationskraft unter konstanter Spannung, präzise dosierbar.", "en": "Cable at chest height, arms straight: rotate the trunk away from the stack, return slowly. Rotational strength under constant tension, precisely loadable."}')
) as v(name, slug, region, pattern, strength_pattern, core_type, min_level, intensity, measurement, movement_type, image_group, descr)
join categories c on c.slug = 'strength'
where not exists (select 1 from exercises e where e.slug = v.slug);

-- Equipment (Filter ist any-match): Goblet-Übungen dumbbell ODER kettlebell;
-- Step-Up plyo_box ODER bench; Landmine/Cable ortsgebunden ans Gym-Gerät.
insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from (values
  ('loaded_lateral_lunge', 'dumbbell'), ('loaded_lateral_lunge', 'kettlebell'),
  ('lateral_step_up', 'plyo_box'), ('lateral_step_up', 'bench'),
  ('kb_split_squat_rotation', 'kettlebell'), ('kb_split_squat_rotation', 'dumbbell'),
  ('rotational_single_leg_rdl', 'dumbbell'), ('rotational_single_leg_rdl', 'kettlebell'),
  ('landmine_rotation', 'landmine'),
  ('standing_cable_rotation', 'cable_machine')
) as v(ex_slug, eq_slug)
join exercises e on e.slug = v.ex_slug
join equipments eq on eq.slug = v.eq_slug
where not exists (
  select 1 from exercise_equipments xe
  where xe.exercise_id = e.id and xe.equipment_id = eq.id
);

-- Environments: Bodyweight überall; Hantel-Übungen gym/home; Landmine/Cable nur gym.
insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on (
  (e.slug in ('lateral_lunge', 'curtsy_lunge', 'lateral_step_up') and env.slug in ('gym', 'home', 'outdoor'))
  or (e.slug in ('loaded_lateral_lunge', 'kb_split_squat_rotation', 'rotational_single_leg_rdl') and env.slug in ('gym', 'home'))
  or (e.slug in ('landmine_rotation', 'standing_cable_rotation') and env.slug = 'gym')
)
where e.slug in ('lateral_lunge', 'loaded_lateral_lunge', 'lateral_step_up', 'kb_split_squat_rotation',
                 'curtsy_lunge', 'rotational_single_leg_rdl', 'landmine_rotation', 'standing_cable_rotation')
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );

-- exercise_regions: primäre Region konsistent zur body_region-Spalte.
insert into exercise_regions (exercise_id, region, role)
select e.id, e.body_region, 'primary'
from exercises e
where e.slug in ('lateral_lunge', 'loaded_lateral_lunge', 'lateral_step_up', 'kb_split_squat_rotation',
                 'curtsy_lunge', 'rotational_single_leg_rdl', 'landmine_rotation', 'standing_cable_rotation')
  and not exists (
    select 1 from exercise_regions xr where xr.exercise_id = e.id and xr.role = 'primary'
  );

commit;
