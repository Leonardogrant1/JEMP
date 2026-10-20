// Der plyo-Block hat zwei Varianten (Session-Composition-Spec 2026-10-09:
// EIN Blocktyp, Variante lower/upper über die Säule der Übungen). Das Label
// muss der Variante folgen: Sprünge = „Sprungkraft", Würfe/Plyo-Push =
// „Explosivkraft" — sonst steht ein Landmine Punch Throw unter „Sprungkraft".
export function blockTypeLabelKey(
    blockSlug: string | null | undefined,
    exerciseCategorySlugs: (string | null | undefined)[],
): string | null {
    if (!blockSlug) return null;
    if (blockSlug === 'plyo') {
        const known = exerciseCategorySlugs.filter((s): s is string => !!s);
        const upper = known.filter((s) => s === 'upper_body_plyometrics').length;
        if (known.length > 0 && upper * 2 > known.length) return 'block_type.plyo_upper';
    }
    return `block_type.${blockSlug}`;
}
