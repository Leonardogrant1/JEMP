-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Sprints: sprint variants + technique drills (spec §1.1).
UPDATE exercises SET category_id = (SELECT id FROM categories WHERE slug = 'sprints')
WHERE slug IN (
  'sprint_10m','sprint_30m','sprint_10m_flying','flying_20_sprint',
  'acceleration_sprint_10m','sprint_start_blocks','stair_sprint',
  'resisted_sprint','sprint_parachute_run','banded_sprint_resistance_run',
  'sled_push','sled_pull','prowler_push_sprint',
  'a_skip_drill','b_skip_drill','high_knees','butt_kicks','wall_drill_march',
  'banded_hip_flexor_march','sprint_in_place'
);

-- COD: change-of-direction drills and tests.
UPDATE exercises SET category_id = (SELECT id FROM categories WHERE slug = 'cod')
WHERE slug IN (
  'agility_505','t_drill','pro_agility_shuttle','lateral_shuffle',
  'agility_ladder_ickey_shuffle','agility_ladder_single_leg_hops'
);

-- Conditioning: circuit/interval movements (format carriers, spec §2.6).
UPDATE exercises SET category_id = (SELECT id FROM categories WHERE slug = 'conditioning')
WHERE slug IN (
  'burpee','burpee_broad_jump','bear_crawl','jumping_jacks',
  'jump_rope_standard','jump_rope_double_under','shadow_boxing','mountain_climber'
);
