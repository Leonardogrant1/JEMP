-- dominant_region: dominante Körperregion für full_body-Übungen (Befund 26.08.:
-- 49 von 206 Übungen sind full_body — für den Region-Filter der Plan-Generierung
-- unsichtbar; Block-Regionen filtern real fast nichts und Warmup/Cooldown können
-- nicht auf die tatsächliche Belastung matchen, Kraftmuster-Bilanz kann
-- z.B. Cleans (hinge) nicht verbuchen).
--
-- Semantik: NUR für body_region='full_body' gepflegt. NULL = bewusst allgemein
-- (Atmung, Med-Ball-Würfe, Shadow Boxing) -> passiert den Region-Filter wie bisher
-- immer. Gesetzt -> Übung matcht einen Block, wenn dessen Regionen die dominante
-- Region (oder full_body) enthalten; Kraftmuster kommt via Region-zu-Muster-Mapping.
--
-- Slug-basiert und idempotent (prod-portierbar, fehlende Slugs werden übersprungen).

alter table exercises add column if not exists dominant_region body_region;

comment on column exercises.dominant_region is
  'Dominante Region für full_body-Übungen. NULL = bewusst allgemein (passiert Region-Filter immer). Für Übungen mit spezifischer body_region ungenutzt.';

-- ── quad: Squat-/Deceleration-dominant ───────────────────────────────────────
update exercises set dominant_region = 'quad'
where body_region = 'full_body' and dominant_region is null and slug in (
  'burpee', 'burpee_broad_jump', 'star_jump', 'reactive_drop_catch',
  'sled_push', 'sled_pull', 'dumbbell_thruster',
  'agility_505', 'pro_agility_shuttle', 't_drill', 'lateral_shuffle'
);

-- ── glute: Hüftstreckung / Triple Extension ──────────────────────────────────
update exercises set dominant_region = 'glute'
where body_region = 'full_body' and dominant_region is null and slug in (
  'acceleration_sprint_10m', 'sprint_10m', 'sprint_start_blocks',
  'resisted_sprint', 'banded_sprint_resistance_run',
  'dumbbell_clean', 'dumbbell_snatch', 'power_clean', 'power_snatch',
  'hang_power_clean', 'hang_power_snatch', 'isometric_mid_thigh_pull',
  'lateral_bounds'
);

-- ── hamstring: Top-Speed-Sprints / Pawback ───────────────────────────────────
update exercises set dominant_region = 'hamstring'
where body_region = 'full_body' and dominant_region is null and slug in (
  'b_skip_drill', 'butt_kicks', 'sprint_30m', 'flying_20_sprint',
  'sprint_10m_flying', 'sprint_parachute_run', 'stair_sprint'
);

-- ── calf: Ankle Stiffness / schnelle Füße ────────────────────────────────────
update exercises set dominant_region = 'calf'
where body_region = 'full_body' and dominant_region is null and slug in (
  'a_skip_drill', 'jumping_jacks', 'sprint_in_place',
  'agility_ladder_ickey_shuffle', 'agility_ladder_single_leg_hops'
);

-- ── hip: Hüftbeuger / Hüftöffner ─────────────────────────────────────────────
update exercises set dominant_region = 'hip'
where body_region = 'full_body' and dominant_region is null and slug in (
  'high_knees', 'wall_drill_march', 'worlds_greatest_stretch'
);

-- ── core: Rumpf unter Last ───────────────────────────────────────────────────
update exercises set dominant_region = 'core'
where body_region = 'full_body' and dominant_region is null and slug in (
  'bear_crawl', 'farmers_walk'
);

-- ── thoracic: Overhead-Mobilität ─────────────────────────────────────────────
update exercises set dominant_region = 'thoracic'
where body_region = 'full_body' and dominant_region is null and slug in (
  'dowel_overhead_squat', 'overhead_squat_loaded'
);

-- Bewusst NULL (allgemein, sollen jeden Region-Filter passieren):
--   box_breathing, diaphragmatic_breathing, yoga_sun_salutation,
--   shadow_boxing, medicine_ball_slam, med_ball_scoop_toss
