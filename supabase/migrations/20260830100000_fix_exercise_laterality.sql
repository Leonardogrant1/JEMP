-- Fix laterality for exercises that are performed one side at a time
-- but were seeded as 'bilateral'.

UPDATE exercises SET laterality = 'unilateral' WHERE slug IN (
    -- clearly one-sided dynamic work
    'copenhagen_plank',
    'hip_cars',
    'resisted_hip_cars',
    'tempo_hip_cars',
    'ankle_cars',
    'shoulder_cars',
    'landmine_press',
    'wall_supported_hamstring_curl',
    -- per-side stretches
    'hip_flexor_lunge_stretch',
    'standing_quad_stretch',
    'standing_calf_stretch',
    'seated_piriformis_stretch',
    'hip_90_90_stretch',
    'upper_trap_stretch',
    'supine_twist',
    'banded_ankle_distraction',
    -- per-side foam rolls
    'quad_foam_roll',
    'hamstring_foam_roll',
    'glute_foam_roll',
    'it_band_foam_roll',
    'lat_foam_roll'
);

UPDATE exercises SET laterality = 'alternating' WHERE slug IN (
    'spiderman_plank'
);
