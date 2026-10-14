import { blockTypeLabelKey } from '../block-label';

describe('blockTypeLabelKey', () => {
    it('maps non-plyo blocks directly to their i18n key', () => {
        expect(blockTypeLabelKey('warmup', [])).toBe('block_type.warmup');
        expect(blockTypeLabelKey('lower_strength', ['upper_body_plyometrics'])).toBe('block_type.lower_strength');
    });

    it('returns null without a block slug', () => {
        expect(blockTypeLabelKey(null, [])).toBeNull();
        expect(blockTypeLabelKey(undefined, [])).toBeNull();
    });

    it('labels lower plyo blocks as plyo (Sprungkraft)', () => {
        expect(blockTypeLabelKey('plyo', ['lower_body_plyometrics', 'lower_body_plyometrics'])).toBe('block_type.plyo');
        expect(blockTypeLabelKey('plyo', ['jumps'])).toBe('block_type.plyo');
    });

    it('labels upper plyo blocks as plyo_upper (Explosivkraft)', () => {
        expect(blockTypeLabelKey('plyo', ['upper_body_plyometrics', 'upper_body_plyometrics'])).toBe('block_type.plyo_upper');
    });

    it('uses the majority for mixed blocks', () => {
        expect(blockTypeLabelKey('plyo', ['upper_body_plyometrics', 'lower_body_plyometrics', 'upper_body_plyometrics'])).toBe('block_type.plyo_upper');
        expect(blockTypeLabelKey('plyo', ['upper_body_plyometrics', 'lower_body_plyometrics'])).toBe('block_type.plyo');
    });

    it('falls back to plyo when categories are missing', () => {
        expect(blockTypeLabelKey('plyo', [])).toBe('block_type.plyo');
        expect(blockTypeLabelKey('plyo', [null, undefined])).toBe('block_type.plyo');
    });
});
