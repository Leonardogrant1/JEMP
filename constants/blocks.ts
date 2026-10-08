// Geteilte Block-Taxonomie fürs Rendering (Phase 4): ersetzt die drei
// hartkodierten Legacy-Slug-Listen (Hero-Pick, Fokus-Chips, isMainBlock).
// Legacy-Verhalten ist eine Teilmenge — primary/secondary/accessory zuerst.

export const NON_CONTENT_BLOCKS = new Set(['warmup', 'cooldown']);

/** Inhalts-Blöcke (alles außer Warmup/Cooldown) — Hero, Chips, Gruppierung. */
export function isContentBlock(slug: string | null | undefined): boolean {
    return !!slug && !NON_CONTENT_BLOCKS.has(slug);
}

/** Reihenfolge für den Hero-Pick: Legacy-Hauptblöcke zuerst (Parität),
 *  dann v2-Blöcke nach visueller Aussagekraft. */
export const HERO_BLOCK_ORDER: string[] = [
    'primary', 'secondary', 'accessory',
    'lower_body', 'push', 'pull', 'sprint', 'plyo', 'cod', 'rotation', 'core', 'conditioning', 'mobility',
];
