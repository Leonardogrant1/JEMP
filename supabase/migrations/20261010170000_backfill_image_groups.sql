-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip
-- (additiv — technisch jederzeit deploybar, bleibt aber im 3.0.0-Batch)
--
-- image_group-Backfill (QA 10.10.): 23 Übungen ohne Gruppe → Session-Cards
-- fielen auf das Splash-Icon zurück, sobald so eine Übung Hero wurde
-- (z. B. goblet_squat als Kraft-Lead). Explizite Zuordnung nach bestehender
-- Konvention; nur NULL-Zeilen, bestehende Gruppen bleiben unangetastet.

begin;
set local lock_timeout = '5s';

update exercises e
set image_group = v.grp::exercise_image_group
from (values
  ('goblet_squat',                        'squat_patterns'),
  ('reverse_lunge_knee_drive',            'squat_patterns'),
  ('turkish_get_up',                      'dumbbell_complex'),
  ('skull_crusher',                       'upper_push'),
  ('overhead_dumbbell_triceps_extension', 'upper_push'),
  ('scap_push_up',                        'upper_push'),
  ('wall_plyo_push_up',                   'explosive_push'),
  ('prone_ytw_raise',                     'upper_pull'),
  ('dead_hang',                           'upper_pull'),
  ('skater_jump',                         'horizontal_jumps'),
  ('side_to_side_hops',                   'reactive_jumps'),
  ('short_lever_copenhagen_plank',        'hip_thrust'),
  ('side_lying_hip_adduction',            'hip_thrust'),
  ('four_way_neck_isometrics',            'mobility'),
  ('prone_neck_extension',                'mobility'),
  ('supine_neck_flexion',                 'mobility'),
  ('cobra_stretch',                       'mobility'),
  ('cross_body_shoulder_stretch',         'mobility'),
  ('kneeling_lat_stretch',                'mobility'),
  ('overhead_triceps_stretch',            'mobility'),
  ('seated_forward_fold',                 'mobility'),
  ('dynamic_arm_swings',                  'mobility'),
  ('wall_slide',                          'mobility')
) as v(slug, grp)
where e.slug = v.slug and e.image_group is null;

commit;
