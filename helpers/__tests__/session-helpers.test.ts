import { isPlanCompleted } from '@/helpers/session-helpers';

const TODAY = '2026-10-04';

describe('isPlanCompleted', () => {
    it('true, wenn end_date in der Vergangenheit liegt — unabhängig von offenen Sessions', () => {
        expect(isPlanCompleted('2026-10-03', [{ status: 'scheduled' }], TODAY)).toBe(true);
    });

    it('true am End-Tag, wenn keine Session mehr offen ist', () => {
        expect(isPlanCompleted('2026-10-04', [{ status: 'completed' }, { status: 'skipped' }], TODAY)).toBe(true);
    });

    it('false am End-Tag, wenn noch eine Session scheduled ist', () => {
        expect(isPlanCompleted('2026-10-04', [{ status: 'completed' }, { status: 'scheduled' }], TODAY)).toBe(false);
    });

    it('false am End-Tag, wenn noch eine Session in_progress ist', () => {
        expect(isPlanCompleted('2026-10-04', [{ status: 'in_progress' }], TODAY)).toBe(false);
    });

    it('false, wenn end_date in der Zukunft liegt — auch ohne offene Sessions', () => {
        expect(isPlanCompleted('2026-10-10', [{ status: 'completed' }], TODAY)).toBe(false);
    });

    it('false ohne end_date', () => {
        expect(isPlanCompleted(null, [{ status: 'completed' }], TODAY)).toBe(false);
        expect(isPlanCompleted(undefined, [{ status: 'completed' }], TODAY)).toBe(false);
    });

    it('false am End-Tag ohne Sessions (Plan nie materialisiert)', () => {
        expect(isPlanCompleted('2026-10-04', [], TODAY)).toBe(false);
    });
});
