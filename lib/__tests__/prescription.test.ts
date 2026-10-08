import { intervalPrescription, plannedSetCount } from '@/lib/prescription';

describe('intervalPrescription', () => {
    it('liefert das Tripel bei gesetzten Runden und Arbeitszeit', () => {
        expect(intervalPrescription({ target_rounds: 10, target_duration_seconds: 30, target_rest_seconds: 30 }))
            .toEqual({ rounds: 10, workSeconds: 30, restSeconds: 30 });
    });
    it('null ohne Runden; Pause fällt auf 0 zurück', () => {
        expect(intervalPrescription({ target_rounds: null, target_duration_seconds: 30 })).toBeNull();
        expect(intervalPrescription({ target_rounds: 0, target_duration_seconds: 30 })).toBeNull();
        expect(intervalPrescription({ target_rounds: 4, target_duration_seconds: 40, target_rest_seconds: null }))
            .toEqual({ rounds: 4, workSeconds: 40, restSeconds: 0 });
    });
});

describe('plannedSetCount (rounds-as-sets, Review Focus 2)', () => {
    it('Runden gewinnen, sonst Sätze, sonst 1', () => {
        expect(plannedSetCount({ target_rounds: 10, target_sets: 1 })).toBe(10);
        expect(plannedSetCount({ target_rounds: null, target_sets: 3 })).toBe(3);
        expect(plannedSetCount({})).toBe(1);
    });
});
