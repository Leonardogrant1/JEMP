// Swap-Support-Gate (Finding 2b, Spec §0.4-Abweichung): der Swap-Pool-Builder
// (externals/jemp-api/src/swap-route/swap-pool.ts) liefert für Blocktypen wie
// conditioning/mobility/sprint/cod/rotation immer einen leeren Pool, weil
// exerciseMatchesBlock für diese Slugs standardmäßig `false` zurückgibt (kein
// Pattern-/Variant-Konzept). Ein Swap-Icon dort wäre ein Dead-End-Sheet
// ("keine Alternativen" ohne erkennbaren Grund). Fast-Follow: diese Blocktypen
// bekommen echte Pool-Unterstützung nachgezogen, dann wächst dieses Set.
// Drift-Schutz (Review 20.10.): Ein Worker-Test (swap-support-pin.test.ts)
// pinnt dieses Set gegen SWAPPABLE_BLOCK_TYPES in v2/pool.ts — Abweichung
// bricht die Worker-Suite statt still die UI.
export const SWAP_SUPPORTED_BLOCKS = new Set([
    'warmup', 'cooldown', 'core', 'plyo', 'accessory', 'optional',
    'lower_strength', 'upper_strength', 'push', 'pull', 'lower_body',
]);

export function isSwappableBlock(slug: string | null | undefined): boolean {
    if (!slug) return false;
    return SWAP_SUPPORTED_BLOCKS.has(slug);
}

/** Einziger Bauort für die Swap-Sheet-Route (Review 20.10., K6/C1): die URL
 *  wurde vorher in Overview und ExerciseCard handgebaut und divergierte prompt
 *  (hasLoggedSets dort hartkodiert '0'). */
export function swapExerciseUrl(p: {
    sessionId: string;
    blockExerciseId: string;
    planBlockExerciseId: string | null | undefined;
    scheduledAt: string | null | undefined;
    exerciseId: string;
    hasLoggedSets: boolean;
}): string {
    return `/swap-exercise?sessionId=${p.sessionId}&blockExerciseId=${p.blockExerciseId}`
        + `&planBlockExerciseId=${p.planBlockExerciseId ?? ''}`
        + `&scheduledAt=${encodeURIComponent(p.scheduledAt ?? '')}`
        + `&exerciseId=${p.exerciseId}&hasLoggedSets=${p.hasLoggedSets ? '1' : '0'}`;
}
