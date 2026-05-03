/**
 * Converts a 1–10 ease-of-movement rating to a 1–100 score.
 *
 * 1–3  = stark eingeschränkt (strongly restricted)
 * 4–6  = eingeschränkt (restricted)
 * 7–9  = gut (good)
 * 10   = voll beweglich (fully mobile)
 */
export function mobilityEaseLevel(rating: number): number {
    return Math.round(rating * 10);
}
