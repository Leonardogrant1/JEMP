import { parseInstallReferrer } from '../install-referrer';

describe('parseInstallReferrer', () => {
    it('extracts the code param from a referrer string', () => {
        expect(parseInstallReferrer('code=MAKSYM10')).toBe('MAKSYM10');
    });

    it('normalizes the code to uppercase', () => {
        expect(parseInstallReferrer('code=maksym10')).toBe('MAKSYM10');
    });

    it('finds the code among other params', () => {
        expect(parseInstallReferrer('utm_source=tiktok&code=MAKSYM10&src=bio')).toBe('MAKSYM10');
    });

    it('decodes url-encoded values', () => {
        expect(parseInstallReferrer('code=maksym%2D10')).toBe('MAKSYM-10');
    });

    it('ignores referrers without a code param', () => {
        expect(parseInstallReferrer('utm_source=google-play&utm_medium=organic')).toBeNull();
    });

    it('rejects codes outside the 2-32 char range', () => {
        expect(parseInstallReferrer('code=A')).toBeNull();
        expect(parseInstallReferrer(`code=${'A'.repeat(33)}`)).toBeNull();
    });

    it('rejects codes with invalid characters', () => {
        expect(parseInstallReferrer('code=MAX%2010')).toBeNull();
    });

    it('handles null, empty, and malformed input', () => {
        expect(parseInstallReferrer(null)).toBeNull();
        expect(parseInstallReferrer('')).toBeNull();
        expect(parseInstallReferrer('code=')).toBeNull();
        expect(parseInstallReferrer('%%%')).toBeNull();
    });
});
