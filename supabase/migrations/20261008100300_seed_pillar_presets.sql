-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Pillar preset levels per sport (spec §1.5): 0 = hidden, 1-3 = default level.
-- Authored as PROFILES (grouping layer) expanded to per-sport rows; storage
-- stays per-sport so exceptions never need schema work. score_weight stays 1.0.
WITH profiles(profile, strength, lower_body_plyometrics, upper_body_plyometrics, sprints, cod, conditioning, mobility) AS (VALUES
  ('contact_team',    2, 2, 0, 2, 2, 1, 1),
  ('court_vertical',  2, 3, 0, 1, 2, 1, 1),
  ('net_vertical',    2, 3, 1, 1, 1, 1, 1),
  ('throwing_team',   2, 2, 2, 1, 2, 1, 1),
  ('collision_team',  3, 2, 0, 2, 1, 1, 1),
  ('striker',         2, 1, 3, 1, 0, 2, 1),
  ('hybrid_fighter',  2, 1, 2, 1, 0, 3, 1),
  ('grappler_ground', 2, 1, 1, 0, 0, 3, 2),
  ('grappler_throw',  3, 1, 1, 0, 0, 2, 2),
  ('track_sprint',    2, 2, 0, 3, 0, 0, 1),
  ('track_jump',      2, 3, 0, 2, 0, 0, 1),
  ('track_throw',     3, 1, 3, 0, 0, 0, 1),
  ('endurance_run',   2, 2, 0, 1, 0, 0, 2),
  ('endurance_ride',  2, 1, 0, 0, 0, 0, 2),
  ('endurance_swim',  2, 0, 1, 0, 0, 0, 2),
  ('racket_tennis',   1, 2, 2, 1, 3, 1, 1),
  ('racket_squash',   1, 2, 1, 1, 3, 2, 1),
  ('racket_badminton',1, 3, 1, 1, 3, 1, 1),
  ('gym_power',       3, 1, 0, 0, 0, 1, 2),
  ('gym_oly',         3, 2, 0, 0, 0, 0, 2),
  ('gym_mixed',       2, 2, 1, 0, 0, 2, 1),
  ('gym_physique',    3, 1, 0, 0, 0, 1, 1),
  ('climb',           2, 1, 1, 0, 0, 1, 2),
  ('gym_artistic',    2, 2, 1, 0, 0, 0, 3),
  ('generalist',      2, 2, 0, 1, 1, 1, 1)
), sport_profiles(sport_slug, profile) AS (VALUES
  ('soccer','contact_team'), ('hockey','contact_team'),
  ('basketball','court_vertical'),
  ('volleyball','net_vertical'),
  ('handball','throwing_team'),
  ('rugby','collision_team'), ('football','collision_team'),
  ('boxing','striker'), ('kickboxing','striker'), ('karate','striker'), ('taekwondo','striker'),
  ('mma','hybrid_fighter'),
  ('bjj','grappler_ground'),
  ('judo','grappler_throw'), ('wrestling','grappler_throw'),
  ('sprinting','track_sprint'),
  ('jumping','track_jump'),
  ('throwing','track_throw'),
  ('running','endurance_run'), ('triathlon','endurance_run'),
  ('cycling','endurance_ride'),
  ('swimming','endurance_swim'),
  ('tennis','racket_tennis'),
  ('squash','racket_squash'),
  ('badminton','racket_badminton'),
  ('powerlifting','gym_power'),
  ('weightlifting','gym_oly'),
  ('crossfit','gym_mixed'),
  ('bodybuilding','gym_physique'),
  ('climbing','climb'),
  ('gymnastics','gym_artistic'),
  ('other','generalist')
), expanded AS (
  SELECT sp.sport_slug, x.category_slug, x.relevance
  FROM sport_profiles sp
  JOIN profiles p USING (profile)
  CROSS JOIN LATERAL (VALUES
    ('strength', p.strength),
    ('lower_body_plyometrics', p.lower_body_plyometrics),
    ('upper_body_plyometrics', p.upper_body_plyometrics),
    ('sprints', p.sprints),
    ('cod', p.cod),
    ('conditioning', p.conditioning),
    ('mobility', p.mobility)
  ) AS x(category_slug, relevance)
)
INSERT INTO sport_category_relevance (sport_id, category_id, relevance)
SELECT s.id, c.id, e.relevance
FROM expanded e
JOIN sports s ON s.slug = e.sport_slug
JOIN categories c ON c.slug = e.category_slug
ON CONFLICT (sport_id, category_id) DO UPDATE SET relevance = EXCLUDED.relevance;
