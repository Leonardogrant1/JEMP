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

describe('isDurationMode (Review I1/I2: ein Prädikat für alle drei Stellen)', () => {
    it('duration-measurement ODER Intervall erzwingen Duration-Modus', () => {
        const { isDurationMode } = require('@/lib/prescription');
        expect(isDurationMode('duration', {})).toBe(true);
        expect(isDurationMode('reps_or_duration', { target_rounds: 10, target_duration_seconds: 30 })).toBe(true);
        expect(isDurationMode('reps_or_duration', {})).toBe(false);
        expect(isDurationMode('reps', { target_rounds: null })).toBe(false);
    });
});

describe('distancePrescription (Spec §5.2 Sprint-Zeilen)', () => {
    const { distancePrescription } = require('@/lib/prescription');
    it('liefert Versuche × Meter für Sprint-Zeilen', () => {
        expect(distancePrescription({ target_sets: 4, target_distance_meters: 30 })).toEqual({ attempts: 4, meters: 30 });
    });
    it('null ohne Distanz oder bei Intervall-Format', () => {
        expect(distancePrescription({ target_sets: 3 })).toBeNull();
        expect(distancePrescription({ target_sets: 1, target_distance_meters: 30, target_rounds: 10, target_duration_seconds: 30 })).toBeNull();
    });
});
