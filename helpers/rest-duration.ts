// „Keine Pause" ist ein legitimer Zustand: Warmup-/Cooldown-Blöcke (Mobility-
// Drills ohne Last) und eine explizite 0 vom Generator (z.B. Easy Jog) dürfen
// kein Rest-Overlay erzeugen. Der frühere Ausdruck `target || default || 60`
// schluckte die 0 per Falsy-Fallback, und der 15s-Floor machte selbst daraus
// wieder eine Pause. Der Floor schützt jetzt nur noch echte Pausen (> 0) vor
// negativen Tagesform-Adjustments.
// Ausnahme: distanzbasierte Übungen (Lauf-Drills, Steigerungsläufe im
// Speed-Warmup) behalten ihre Pause — der Rückweg IST die Pause.
const NO_REST_BLOCKS = new Set(['warmup', 'cooldown']);

export function restDurationSeconds(args: {
    targetRestSeconds: number | null | undefined;
    blockTypeSlug: string | null | undefined;
    targetDistanceMeters?: number | null;
    sessionDefaultSeconds: number | null | undefined;
    adjustSeconds: number | null | undefined;
}): number {
    const isDistance = (args.targetDistanceMeters ?? 0) > 0;
    if (!isDistance && args.blockTypeSlug && NO_REST_BLOCKS.has(args.blockTypeSlug)) return 0;
    const base = args.targetRestSeconds ?? args.sessionDefaultSeconds ?? 60;
    if (base <= 0) return 0;
    return Math.max(15, base + (args.adjustSeconds ?? 0));
}
