-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Plyo-Typ-Backfill (User-Befund 08.10.): Die Plyo-Schwestern existieren im
-- Prod-Katalog, waren aber untaggt — damit für die max/submax-Rotation und
-- die ballistischen Push/Pull/Rotation-Varianten unsichtbar.
-- Semantik: maximal = volle Kraft pro Versuch (weit/hoch, volle Erholung);
-- submaximal = rhythmisch-federnd, kurze Bodenkontakte.

-- Lower Body — maximal (volle Projektion pro Sprung)
UPDATE exercises SET plyo_type = 'maximal' WHERE slug IN (
    'alternating_jump_lunge', 'bulgarian_split_squat_high_knee_jump',
    'tuck_jump', 'skater_jump', 'lateral_skater_hop_to_plate',
    'mb_skater_hops', 'dumbbell_split_drop_catches', 'reverse_lunge_knee_drive',
    'dumbbell_clean', 'dumbbell_snatch'
) AND plyo_type IS NULL;

-- Lower Body — submaximal (reaktiv, minimale Kontaktzeit)
UPDATE exercises SET plyo_type = 'submaximal' WHERE slug IN (
    'single_leg_reactive_box_jump', 'single_leg_pogo_hop', 'side_to_side_hops'
) AND plyo_type IS NULL;

-- Upper Body — maximal (ballistisch; via strength_pattern zugleich als
-- explosive Varianten in den Push/Pull/Rotation-Blöcken wählbar, Spec §1.1)
UPDATE exercises SET plyo_type = 'maximal' WHERE slug IN (
    'depth_push_up', 'incline_plyo_push_up', 'kneeling_plyo_push_up',
    'explosive_cable_press', 'explosive_cable_row', 'explosive_cable_swing',
    'explosive_rotational_cable_press', 'landmine_punch_throw',
    'landmine_switch_punch', 'med_ball_scoop_toss'
) AND plyo_type IS NULL;

-- Pattern-Tags für die ballistischen Oberkörper-Varianten (Block-Zuordnung)
UPDATE exercises SET strength_pattern = 'push_horizontal' WHERE slug IN (
    'explosive_cable_press', 'depth_push_up', 'incline_plyo_push_up', 'kneeling_plyo_push_up'
) AND strength_pattern IS NULL;
UPDATE exercises SET strength_pattern = 'pull_horizontal' WHERE slug IN (
    'explosive_cable_row'
) AND strength_pattern IS NULL;
UPDATE exercises SET strength_pattern = 'rotation' WHERE slug IN (
    'explosive_rotational_cable_press', 'landmine_punch_throw', 'landmine_switch_punch'
) AND strength_pattern IS NULL;

-- Bewusst untaggt: band_pull_apart + scapular_pull_up (Prehab, keine Ballistik),
-- leg_swing_* (Mobility-Drills in falscher Kategorie — Warmup-Pool via Intensität).
