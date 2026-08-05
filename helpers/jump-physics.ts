const GRAVITY = 9.81;

// Flugzeit-Methode: Sprunghöhe h = g·t²/8 — braucht nur die Zeit zwischen
// Absprung und Landung, keine Kalibrierung oder Distanzschätzung im Bild.
// Validiert gegen Kraftmessplatten (My-Jump-Studien, ICC ~0.99); setzt
// voraus, dass mit gestreckten Beinen gelandet wird (Hände an der Hüfte).
export function flightTimeToJumpHeightCm(flightSeconds: number): number {
    if (flightSeconds <= 0) return 0;
    const meters = (GRAVITY * flightSeconds * flightSeconds) / 8;
    return Math.round(meters * 100 * 10) / 10;
}
