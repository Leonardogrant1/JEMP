import { isContentBlock, HERO_BLOCK_ORDER } from '@/constants/blocks';

describe('isContentBlock', () => {
    it('akzeptiert Legacy-Hauptblöcke und alle v2-Inhalts-Blöcke', () => {
        for (const slug of ['primary', 'secondary', 'accessory', 'push', 'pull', 'lower_body', 'rotation', 'core', 'plyo', 'sprint', 'cod', 'conditioning', 'mobility']) {
            expect(isContentBlock(slug)).toBe(true);
        }
    });
    it('lehnt Warmup/Cooldown und leere Werte ab', () => {
        expect(isContentBlock('warmup')).toBe(false);
        expect(isContentBlock('cooldown')).toBe(false);
        expect(isContentBlock(null)).toBe(false);
        expect(isContentBlock(undefined)).toBe(false);
    });
});

describe('HERO_BLOCK_ORDER', () => {
    it('beginnt mit den Legacy-Slugs (Render-Parität) und deckt alle v2-Blöcke ab', () => {
        expect(HERO_BLOCK_ORDER.slice(0, 3)).toEqual(['primary', 'secondary', 'accessory']);
        for (const slug of ['lower_body', 'push', 'pull', 'sprint', 'plyo', 'cod', 'rotation', 'core', 'conditioning', 'mobility']) {
            expect(HERO_BLOCK_ORDER).toContain(slug);
        }
    });
});

describe('isFocusChipBlock (Review I3: Legacy-Chip-Parität)', () => {
    const { isFocusChipBlock } = require('@/constants/blocks');
    it('Legacy: nur primary/secondary — accessory bleibt draußen wie vorher', () => {
        expect(isFocusChipBlock('primary')).toBe(true);
        expect(isFocusChipBlock('secondary')).toBe(true);
        expect(isFocusChipBlock('accessory')).toBe(false);
    });
    it('v2-Inhalts-Blöcke liefern Chips, Warmup/Cooldown nie', () => {
        expect(isFocusChipBlock('push')).toBe(true);
        expect(isFocusChipBlock('sprint')).toBe(true);
        expect(isFocusChipBlock('warmup')).toBe(false);
    });
});

describe('isProgressBlock (Review I6: Fortschritt ohne Conditioning/Mobility)', () => {
    const { isProgressBlock } = require('@/constants/blocks');
    it('Kraft-/Explosiv-Blöcke zählen, Conditioning/Mobility nicht', () => {
        for (const slug of ['primary', 'secondary', 'accessory', 'push', 'pull', 'lower_body', 'rotation', 'core', 'plyo', 'sprint', 'cod']) {
            expect(isProgressBlock(slug)).toBe(true);
        }
        expect(isProgressBlock('conditioning')).toBe(false);
        expect(isProgressBlock('mobility')).toBe(false);
        expect(isProgressBlock('warmup')).toBe(false);
    });
});
