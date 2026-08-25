import { parseReferralClipboard } from '../referral-clipboard';

describe('parseReferralClipboard', () => {
    it('extracts the code from a JEMP: clipboard payload', () => {
        expect(parseReferralClipboard('JEMP:MAKSYM10')).toBe('MAKSYM10');
    });

    it('is case-insensitive and normalizes to uppercase', () => {
        expect(parseReferralClipboard('jemp:maksym10')).toBe('MAKSYM10');
    });

    it('tolerates surrounding whitespace', () => {
        expect(parseReferralClipboard('  JEMP:MAKSYM10\n')).toBe('MAKSYM10');
    });

    it('accepts underscores and hyphens in the code', () => {
        expect(parseReferralClipboard('JEMP:MAX_10-X')).toBe('MAX_10-X');
    });

    it('rejects clipboard content without the prefix', () => {
        expect(parseReferralClipboard('MAKSYM10')).toBeNull();
        expect(parseReferralClipboard('some random text')).toBeNull();
    });

    it('rejects codes outside the 2-32 char range', () => {
        expect(parseReferralClipboard('JEMP:A')).toBeNull();
        expect(parseReferralClipboard(`JEMP:${'A'.repeat(33)}`)).toBeNull();
    });

    it('rejects codes with invalid characters', () => {
        expect(parseReferralClipboard('JEMP:MAX 10')).toBeNull();
        expect(parseReferralClipboard('JEMP:MAX!10')).toBeNull();
    });

    it('handles null and empty input', () => {
        expect(parseReferralClipboard(null)).toBeNull();
        expect(parseReferralClipboard('')).toBeNull();
    });
});
