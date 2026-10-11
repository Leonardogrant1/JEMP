// Geteilte Block-Taxonomie fürs Rendering (Phase 4): ersetzt die drei
// hartkodierten Legacy-Slug-Listen (Hero-Pick, Fokus-Chips, isMainBlock).
// Legacy-Verhalten ist eine Teilmenge — primary/secondary/accessory zuerst.

export const NON_CONTENT_BLOCKS = new Set(['warmup', 'cooldown']);

/** Inhalts-Blöcke (alles außer Warmup/Cooldown) — Hero, Chips, Gruppierung. */
export function isContentBlock(slug: string | null | undefined): boolean {
    return !!slug && !NON_CONTENT_BLOCKS.has(slug);
}

/** Reihenfolge für den Hero-Pick: Legacy-Hauptblöcke zuerst (Parität),
 *  dann v2-Blöcke nach visueller Aussagekraft. accessory bewusst HINTER den
 *  Kraftblöcken (QA 10.10.): v2-Sessions haben accessory UND lower/upper_strength —
 *  der Hero soll der Haupt-Lift sein, nicht die Füller-Übung. */
export const HERO_BLOCK_ORDER: string[] = [
    'primary', 'secondary',
    'lower_strength', 'upper_strength',
    'lower_body', 'push', 'pull', 'sprint', 'plyo', 'cod', 'rotation', 'accessory', 'core', 'conditioning', 'mobility', 'optional',
];

/** Fokus-Chips: Hauptreize ohne Accessory — bewahrt die Legacy-Chip-Semantik
 *  (primary/secondary) und überträgt sie sinngemäß auf v2-Blöcke. */
export function isFocusChipBlock(slug: string | null | undefined): boolean {
    return isContentBlock(slug) && slug !== 'accessory';
}

/** Fortschritts-Tracking: Inhalts-Blöcke ohne Conditioning/Mobility —
 *  Runden-/Dehn-Volumen würde die aussagekräftigen Progressionen ertränken. */
export function isProgressBlock(slug: string | null | undefined): boolean {
    return isContentBlock(slug) && slug !== 'conditioning' && slug !== 'mobility';
}
