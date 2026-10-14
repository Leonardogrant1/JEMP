import { SESSION_DETAIL_SELECT } from '@/queries/session-detail-select';

// Regression-Pin für Phase-4-Review Critical 1: die Intervall-/Distanz-Felder
// MÜSSEN selektiert werden, sonst sind Conditioning-Runden und Sprint-Distanzen
// stilles totes Feature (intervalPrescription immer null).
describe('SESSION_DETAIL_SELECT', () => {
    it('selektiert target_rounds und target_distance_meters', () => {
        expect(SESSION_DETAIL_SELECT).toContain('target_rounds');
        expect(SESSION_DETAIL_SELECT).toContain('target_distance_meters');
        // Plyo-Varianten-Label (Sprungkraft vs. Explosivkraft) braucht die Kategorie
        expect(SESSION_DETAIL_SELECT).toContain('category:categories ( slug )');
    });
});
