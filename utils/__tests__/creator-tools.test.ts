import { canUseCreatorTools } from '../creator-tools';

describe('canUseCreatorTools', () => {
    it('allows affiliate and admin', () => {
        expect(canUseCreatorTools('affiliate')).toBe(true);
        expect(canUseCreatorTools('admin')).toBe(true);
    });

    it('denies user, tester and missing role', () => {
        expect(canUseCreatorTools('user')).toBe(false);
        expect(canUseCreatorTools('tester')).toBe(false);
        expect(canUseCreatorTools(null)).toBe(false);
        expect(canUseCreatorTools(undefined)).toBe(false);
    });
});
