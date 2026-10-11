-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Transversale Push/Pull- und hinge-Lücken schließen (Spec 2026-10-11 §5):
-- Push transversal hatte 1 Übung (explosive_rotational_cable_press), Pull 0,
-- hinge transversal 1 / frontal 0. Gehört in DASSELBE Deployment wie der
-- sport_plane_weights-Seed (combat hinge 30 % setzt den Pool voraus).
-- Ohne Video/Thumbnail (nachpflegen). Idempotent.

begin;
set local lock_timeout = '5s';

insert into exercises (name, slug, category_id, body_region, movement_pattern, strength_pattern,
  min_level, max_level, intensity_score, exercise_type, measurement_type, laterality, movement_type,
  is_explosive, image_group, description_i18n)
select v.name, v.slug, c.id, v.region::body_region, v.pattern::movement_pattern,
  v.strength_pattern::strength_pattern, v.min_level, 100, v.intensity, 'dynamic', 'reps',
  'unilateral'::laterality, v.movement_type::movement_type, false,
  v.image_group::exercise_image_group, v.descr::jsonb
from (values
  ('Split Stance Landmine Press', 'split_stance_landmine_press', 'shoulder', 'push', 'push_vertical', 20, 6, 'transverse', 'upper_push',
   '{"de": "Im Schrittstand die Landmine-Stange einarmig schräg nach vorn-oben drücken — Hüfte und Rumpf übertragen die Kraft vom Boden in den Arm. Der Schlag als Kraftübung: schwer, geführt, kontrolliert.", "en": "In a split stance, press the landmine bar up and forward with one arm — hips and trunk transfer force from the ground into the arm. The punch as a strength exercise: heavy, guided, controlled."}'),
  ('Single-Arm Cable Press with Rotation', 'single_arm_cable_press_rotation', 'chest', 'push', 'push_horizontal', 25, 6, 'transverse', 'upper_push',
   '{"de": "Kabel auf Brusthöhe, Schrittstand mit Rücken zur Maschine: einarmig nach vorn drücken und dabei Hüfte und Rumpf in den Stoß eindrehen. Druckkraft aus der Rotationskette statt aus der Bank.", "en": "Cable at chest height, split stance facing away: press forward with one arm while hips and trunk rotate into the push. Pressing power from the rotational chain, not the bench."}'),
  ('Rotational Cable Row', 'rotational_cable_row', 'upper_back', 'pull', 'pull_horizontal', 15, 5, 'transverse', 'upper_pull',
   '{"de": "Kabel einarmig aus leichter Rotation heranziehen und den Rumpf mit dem Zug aufdrehen. Zugkraft plus Rotationskontrolle — die Gegenbewegung zu jedem Schlag und Wurf.", "en": "Row the cable with one arm out of a slight rotation, opening the trunk as you pull. Pulling strength plus rotational control — the counter-movement to every punch and throw."}'),
  ('Single-Arm Dumbbell Row with Rotation', 'single_arm_dumbbell_row_rotation', 'upper_back', 'pull', 'pull_horizontal', 20, 5, 'transverse', 'upper_pull',
   '{"de": "Einarmiges Rudern, am obersten Punkt den Oberkörper leicht zur Zugseite aufdrehen und kontrolliert zurück. Rücken und Rumpf arbeiten gegen Rotation unter Last.", "en": "Single-arm row; at the top, rotate the torso slightly toward the pulling side and return under control. Back and trunk work against rotation under load."}'),
  ('Cross-Body Kettlebell Deadlift', 'cross_body_kettlebell_deadlift', 'hamstring', 'pull', 'hinge', 20, 5, 'transverse', 'hip_hinge',
   '{"de": "Kettlebell steht außen neben dem gegenüberliegenden Fuß: in der Hüftbeuge diagonal über den Körper greifen, aufrichten, kontrolliert zurück. Hüftzug mit Rotationsanteil — die hintere Kette lernt Drehen unter Last.", "en": "Kettlebell placed outside the opposite foot: hinge, reach diagonally across the body, stand tall, return under control. A hip hinge with a rotational component — the posterior chain learns to turn under load."}'),
  ('Single-Leg RDL with Lateral Reach', 'single_leg_rdl_lateral_reach', 'hamstring', 'pull', 'hinge', 25, 5, 'frontal', 'hip_hinge',
   '{"de": "Einbeiniges Kreuzheben, die Hantel in der Hüftbeuge seitlich neben das Standbein führen statt gerade nach unten. Die hintere Kette arbeitet, während die Hüfte seitlich stabilisiert — Bremskraft für Richtungswechsel.", "en": "Single-leg RDL, guiding the weight laterally beside the stance leg instead of straight down. The posterior chain works while the hip stabilizes laterally — braking strength for change of direction."}')
) as v(name, slug, region, pattern, strength_pattern, min_level, intensity, movement_type, image_group, descr)
join categories c on c.slug = 'strength'
where not exists (select 1 from exercises e where e.slug = v.slug);

-- Equipment (any-match): Landmine/Cable ortsgebunden, Hantel-Übungen flexibel.
insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from (values
  ('split_stance_landmine_press', 'landmine'),
  ('single_arm_cable_press_rotation', 'cable_machine'),
  ('rotational_cable_row', 'cable_machine'),
  ('single_arm_dumbbell_row_rotation', 'dumbbell'), ('single_arm_dumbbell_row_rotation', 'bench'),
  ('cross_body_kettlebell_deadlift', 'kettlebell'), ('cross_body_kettlebell_deadlift', 'dumbbell'),
  ('single_leg_rdl_lateral_reach', 'dumbbell'), ('single_leg_rdl_lateral_reach', 'kettlebell')
) as v(ex_slug, eq_slug)
join exercises e on e.slug = v.ex_slug
join equipments eq on eq.slug = v.eq_slug
where not exists (
  select 1 from exercise_equipments xe
  where xe.exercise_id = e.id and xe.equipment_id = eq.id
);

-- Environments: Landmine/Cable nur gym, Hantel-Übungen gym/home.
insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on (
  (e.slug in ('split_stance_landmine_press', 'single_arm_cable_press_rotation', 'rotational_cable_row') and env.slug = 'gym')
  or (e.slug in ('single_arm_dumbbell_row_rotation', 'cross_body_kettlebell_deadlift', 'single_leg_rdl_lateral_reach') and env.slug in ('gym', 'home'))
)
where not exists (
  select 1 from exercise_environments xe
  where xe.exercise_id = e.id and xe.environment_id = env.id
);

-- exercise_regions: primäre Region konsistent zur body_region-Spalte.
insert into exercise_regions (exercise_id, region, role)
select e.id, e.body_region, 'primary'
from exercises e
where e.slug in ('split_stance_landmine_press', 'single_arm_cable_press_rotation', 'rotational_cable_row',
                 'single_arm_dumbbell_row_rotation', 'cross_body_kettlebell_deadlift', 'single_leg_rdl_lateral_reach')
  and not exists (
    select 1 from exercise_regions xr where xr.exercise_id = e.id and xr.role = 'primary'
  );

commit;
