-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- Accessory-Pool auffüllen (QA 10.10.): kleine Muskeln — Adduktoren, Hüftbeuger,
-- Waden, Füße. Der Pool war ~10 Übungen dünn, Hüftbeuger fehlten komplett
-- (banded_hip_flexor_march lebt in sprints, hip_flexion_lift_off in mobility —
-- der Accessory-Filter verlangt Kategorie strength). Bodyweight-/Band-Übungen
-- bewusst auch für home/outdoor. Ohne Video/Thumbnail (nachpflegen). Idempotent.

begin;
set local lock_timeout = '5s';

insert into exercises (name, slug, category_id, body_region, movement_pattern, min_level, max_level,
  intensity_score, exercise_type, measurement_type, laterality, movement_type, is_explosive, image_group, description_i18n)
select v.name, v.slug, c.id, v.region::body_region, v.pattern::movement_pattern, 1, 100,
  v.intensity, 'dynamic', v.measurement, v.laterality::laterality, v.movement_type::movement_type, false,
  -- image_group nach bestehender Konvention: Hüfte/Adduktoren → hip_thrust, Waden/Füße → mobility
  (case when v.region in ('hip', 'groin') then 'hip_thrust' else 'mobility' end)::exercise_image_group, v.descr::jsonb
from (values
  ('Standing Knee Raise Hold', 'standing_knee_raise_hold', 'hip', 'isometric', 3, 'duration', 'unilateral', 'sagittal',
   '{"de": "Im Stand ein Knie über Hüfthöhe ziehen und dort halten — ohne Oberkörper-Ausweichen. Kräftigt den Hüftbeuger isometrisch, die Basis für Kniehub im Sprint.", "en": "Standing, drive one knee above hip height and hold it there — no trunk lean. Strengthens the hip flexor isometrically, the base for knee drive in sprinting."}'),
  ('Banded Standing Hip Flexion', 'banded_standing_hip_flexion', 'hip', 'legs', 4, 'reps_or_duration', 'unilateral', 'sagittal',
   '{"de": "Band unter dem Standfuß oder tief verankert, Schlaufe um den anderen Fuß: Knie kontrolliert gegen den Zug über Hüfthöhe heben und langsam absenken.", "en": "Band anchored low or under the stance foot, loop around the other foot: drive the knee above hip height against the pull, lower slowly."}'),
  ('Seated Calf Raise', 'seated_calf_raise', 'calf', 'legs', 4, 'reps_or_duration', 'bilateral', 'sagittal',
   '{"de": "Sitzend, Kurzhantel oder Scheibe auf den Knien: Fersen maximal heben und oben kurz halten. Das gebeugte Knie verlagert die Arbeit auf den Soleus — den Dämpfer bei Landungen.", "en": "Seated with a dumbbell or plate on the knees: raise the heels fully and pause at the top. The bent knee shifts the work to the soleus — your landing absorber."}'),
  ('Heel Walk', 'heel_walk', 'ankle', 'legs', 3, 'duration', 'bilateral', 'sagittal',
   '{"de": "Auf den Fersen gehen, Zehen aktiv Richtung Schienbein gezogen. Kräftigt Tibialis und Fußheber — Schutz fürs Schienbein bei Sprints und Richtungswechseln.", "en": "Walk on your heels with toes pulled toward the shins. Strengthens the tibialis and ankle dorsiflexors — shin protection for sprints and cuts."}'),
  ('Toe Walk', 'toe_walk', 'ankle', 'legs', 3, 'duration', 'bilateral', 'sagittal',
   '{"de": "Auf den Zehenspitzen gehen, Ferse so hoch wie möglich, Körper lang. Baut Fuß- und Wadenstabilität für Abdruck und Landung auf.", "en": "Walk on your toes, heels as high as possible, body tall. Builds foot and calf stability for push-off and landing."}'),
  ('Short Foot Hold', 'short_foot_hold', 'ankle', 'isometric', 2, 'duration', 'unilateral', 'sagittal',
   '{"de": "Barfuß im Stand das Fußgewölbe aufspannen: Großzehenballen und Ferse bleiben am Boden, der Mittelfuß zieht sich zusammen — halten, ohne die Zehen zu krallen.", "en": "Standing barefoot, dome the arch: big-toe ball and heel stay down while the midfoot shortens — hold without curling the toes."}'),
  ('Standing Banded Hip Adduction', 'standing_banded_hip_adduction', 'groin', 'legs', 3, 'reps_or_duration', 'unilateral', 'frontal',
   '{"de": "Band seitlich verankert, Schlaufe am Knöchel des inneren Beins: Bein kontrolliert gegen den Zug vor dem Standbein zur Mitte führen. Adduktoren-Kraft für Richtungswechsel.", "en": "Band anchored to the side, loop around the inside ankle: pull the leg across in front of the stance leg against the band. Adductor strength for change of direction."}')
) as v(name, slug, region, pattern, intensity, measurement, laterality, movement_type, descr)
join categories c on c.slug = 'strength'
where not exists (select 1 from exercises e where e.slug = v.slug);

-- Equipment: Band-Übungen → resistance_band (portabel, nicht ortsgebunden);
-- Seated Calf Raise → dumbbell ODER plate (Filter ist any-match).
insert into exercise_equipments (exercise_id, equipment_id)
select e.id, eq.id
from (values
  ('banded_standing_hip_flexion', 'resistance_band'),
  ('standing_banded_hip_adduction', 'resistance_band'),
  ('seated_calf_raise', 'dumbbell'),
  ('seated_calf_raise', 'plate')
) as v(ex_slug, eq_slug)
join exercises e on e.slug = v.ex_slug
join equipments eq on eq.slug = v.eq_slug
where not exists (
  select 1 from exercise_equipments xe
  where xe.exercise_id = e.id and xe.equipment_id = eq.id
);

-- Environments: Bodyweight/Band überall; Seated Calf Raise nicht outdoor.
insert into exercise_environments (exercise_id, environment_id)
select e.id, env.id
from exercises e
join environments env on (
  env.slug in ('gym', 'home')
  or (env.slug = 'outdoor' and e.slug <> 'seated_calf_raise')
)
where e.slug in ('standing_knee_raise_hold', 'banded_standing_hip_flexion', 'seated_calf_raise',
                 'heel_walk', 'toe_walk', 'short_foot_hold', 'standing_banded_hip_adduction')
  and not exists (
    select 1 from exercise_environments xe
    where xe.exercise_id = e.id and xe.environment_id = env.id
  );

-- exercise_regions (m:n, 10.10.): primäre Region konsistent zur body_region-Spalte.
insert into exercise_regions (exercise_id, region, role)
select e.id, e.body_region, 'primary'
from exercises e
where e.slug in ('standing_knee_raise_hold', 'banded_standing_hip_flexion', 'seated_calf_raise',
                 'heel_walk', 'toe_walk', 'short_foot_hold', 'standing_banded_hip_adduction')
  and not exists (
    select 1 from exercise_regions xr where xr.exercise_id = e.id and xr.role = 'primary'
  );

commit;
