-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Session-Composition-Rework (Spec 2026-10-09 §2.3/§2.4/§2.5): Label-Backfill.

-- 1. is_explosive: alle ballistischen Übungen. Datengetrieben über plyo_type
--    (deckt Jumps, Lower-/Upper-Plyos, Olympic Lifts) und sprint_type; plus die
--    eine explosive Upper-Plyo ohne plyo_type. Bewusst NICHT pauschal nach
--    Kategorie — Mobility-Drills in lbp (leg_swing) sind nicht explosiv.
UPDATE exercises SET is_explosive = true
WHERE plyo_type IS NOT NULL
   OR sprint_type IS NOT NULL
   OR slug = 'wall_plyo_push_up';

-- 2. movement_type = transverse: rotatorische Übungen (Würfe, Chops, Twists,
--    Rotations-Mobility). Deckt auch strength_pattern='rotation' ab.
UPDATE exercises SET movement_type = 'transverse'
WHERE strength_pattern = 'rotation'
   OR slug IN (
     'cable_chop', 'deep_lunge_rotation', 'explosive_rotational_cable_press',
     'half_kneeling_kb_chops', 'landmine_punch_throw', 'landmine_switch_punch',
     'loaded_deep_lunge_rotation', 'prone_hip_internal_rotation',
     'rotational_med_ball_slam', 'rotational_med_ball_throw',
     'standing_spinal_rotation', 'supine_twist'
   );

-- 3. movement_type = frontal: laterale Bewegungen (Frontalebene).
UPDATE exercises SET movement_type = 'frontal'
WHERE slug IN (
  'banded_lateral_raise', 'banded_monster_walk', 'copenhagen_hip_adduction',
  'copenhagen_plank', 'cossack_squat', 'dumbbell_lateral_lunge',
  'dumbbell_lateral_raise', 'lateral_band_walk', 'lateral_bounds',
  'lateral_hurdle_hop', 'lateral_lunge', 'lateral_shuffle',
  'lateral_skater_hop_to_plate', 'leg_swing_side_to_side', 'loaded_cossack_squat',
  'mb_skater_hops', 'short_lever_copenhagen_plank', 'side_lying_hip_adduction',
  'side_to_side_hops', 'skater_jump', 'standing_hip_abduction'
);

-- 4. strength_pattern = 'rotation' entfällt (§2.5): Rotation ist eine Ebene
--    (movement_type=transverse, oben gesetzt), kein Kraftmuster. Die Übungen
--    bleiben über Säule + movement_type klassifiziert.
UPDATE exercises SET strength_pattern = NULL WHERE strength_pattern = 'rotation';

-- 5. core_type (stability/power) bleibt als DEPRECATED bestehen (§2.6): der neue
--    v2-Matcher liest movement_type + is_explosive statt core_type. Kein DROP,
--    damit Legacy-Pläne in der App nicht brechen.
COMMENT ON COLUMN exercises.core_type IS 'DEPRECATED (2026-10-09): ersetzt durch movement_type + is_explosive. Bleibt für Legacy-Pläne.';
