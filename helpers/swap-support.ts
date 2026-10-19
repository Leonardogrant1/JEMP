// Swap-Support-Gate (Finding 2b, Spec §0.4-Abweichung): der Swap-Pool-Builder
// (externals/jemp-api/src/swap-route/swap-pool.ts) liefert für Blocktypen wie
// conditioning/mobility/sprint/cod/rotation immer einen leeren Pool, weil
// exerciseMatchesBlock für diese Slugs standardmäßig `false` zurückgibt (kein
// Pattern-/Variant-Konzept). Ein Swap-Icon dort wäre ein Dead-End-Sheet
// ("keine Alternativen" ohne erkennbaren Grund). Fast-Follow: diese Blocktypen
// bekommen echte Pool-Unterstützung nachgezogen, dann wächst dieses Set.
export const SWAP_SUPPORTED_BLOCKS = new Set([
    'warmup', 'cooldown', 'core', 'plyo', 'accessory', 'optional',
    'lower_strength', 'upper_strength', 'push', 'pull', 'lower_body',
]);

export function isSwappableBlock(slug: string | null | undefined): boolean {
    if (!slug) return false;
    return SWAP_SUPPORTED_BLOCKS.has(slug);
}
