-- ─────────────────────────────────────────────────────────────
-- Environments
-- ─────────────────────────────────────────────────────────────

INSERT INTO environments (slug) VALUES
    ('gym'),
    ('outdoor'),
    ('home')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Equipment
-- ─────────────────────────────────────────────────────────────

INSERT INTO equipments (slug) VALUES
    -- Free weights
    ('barbell'),
    ('dumbbell'),
    ('kettlebell'),
    ('weight_belt'),

    -- Racks / benches
    ('squat_rack'),
    ('bench'),
    ('incline_bench'),

    -- Pull / push stations
    ('pull_up_bar'),
    ('dip_bar'),
    ('cable_machine'),

    -- Plyometrics / agility
    ('plyo_box'),
    ('medicine_ball'),
    ('agility_cones'),
    ('agility_ladder'),

    -- Sleds / conditioning
    ('sled'),
    ('sprint_parachute'),

    -- Jumps / hurdles
    ('jump_rope'),
    ('mini_hurdles'),

    -- Gym machines / benches
    ('back_extension_bench'),
    ('ab_wheel'),
    ('trap_bar'),

    -- Misc
    ('resistance_band'),
    ('foam_roller')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Environment ↔ Equipment mappings
-- ─────────────────────────────────────────────────────────────

-- Gym: everything
INSERT INTO environment_equipments (environment_id, equipment_id)
SELECT e.id, eq.id FROM environments e, equipments eq
WHERE e.slug = 'gym'
ON CONFLICT DO NOTHING;

-- Outdoor: portable equipment
INSERT INTO environment_equipments (environment_id, equipment_id)
SELECT e.id, eq.id FROM environments e, equipments eq
WHERE e.slug = 'outdoor'
  AND eq.slug IN (
      'medicine_ball',
      'resistance_band',
      'agility_cones',
      'agility_ladder',
      'mini_hurdles',
      'plyo_box',
      'sled',
      'sprint_parachute',
      'jump_rope'
  )
ON CONFLICT DO NOTHING;

-- Home: bodyweight-friendly equipment
INSERT INTO environment_equipments (environment_id, equipment_id)
SELECT e.id, eq.id FROM environments e, equipments eq
WHERE e.slug = 'home'
  AND eq.slug IN (
      'pull_up_bar',
      'dip_bar',
      'dumbbell',
      'kettlebell',
      'weight_belt',
      'medicine_ball',
      'resistance_band',
      'plyo_box',
      'foam_roller',
      'agility_ladder',
      'jump_rope',
      'ab_wheel'
  )
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Block types
-- ─────────────────────────────────────────────────────────────

INSERT INTO block_types (slug) VALUES
    ('warmup'),
    ('primary'),
    ('secondary'),
    ('accessory'),
    ('cooldown')
ON CONFLICT DO NOTHING;
