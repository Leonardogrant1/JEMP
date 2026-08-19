export const UNIT_LABELS: Record<string, { en: string; de: string }> = {
    kg: { en: 'kg', de: 'kg' },
    count: { en: 'reps', de: 'Wdh.' },
    s: { en: 'seconds', de: 'Sekunden' },
    cm: { en: 'cm', de: 'cm' },
    m: { en: 'm', de: 'm' },
};

// Tape measure upper bound per assessment slug, in cm.
// Generously above elite level (norm mean + ~5 std) so nobody hits the end.
export const TAPE_MAX_CM: Record<string, number> = {
    vertical_jump: 150,
    box_jump: 200,
    broad_jump: 400,
    mb_chest_throw: 1200,
    mb_rotational_throw: 1400,
    mb_overhead_throw: 1500,
};
export const TAPE_DEFAULT_MAX_CM = 400;

// Number rail upper bound per count-based assessment slug (reps).
export const REP_RAIL_MAX: Record<string, number> = {
    max_pushups: 100,
    max_pullups: 50,
    max_dips: 60,
    clap_pushups: 50,
};
export const REP_RAIL_DEFAULT_MAX = 100;
