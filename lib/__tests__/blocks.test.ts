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
    it('beginnt mit den Legacy-Hauptblöcken (Render-Parität) und deckt alle v2-Blöcke ab', () => {
        expect(HERO_BLOCK_ORDER.slice(0, 2)).toEqual(['primary', 'secondary']);
        for (const slug of ['lower_body', 'push', 'pull', 'sprint', 'plyo', 'cod', 'rotation', 'accessory', 'core', 'conditioning', 'mobility']) {
            expect(HERO_BLOCK_ORDER).toContain(slug);
        }
    });
    it('Kraftblöcke schlagen accessory — der Hero ist der Haupt-Lift, nicht der Füller (QA 10.10.)', () => {
        expect(HERO_BLOCK_ORDER.indexOf('lower_strength')).toBeLessThan(HERO_BLOCK_ORDER.indexOf('accessory'));
        expect(HERO_BLOCK_ORDER.indexOf('upper_strength')).toBeLessThan(HERO_BLOCK_ORDER.indexOf('accessory'));
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

describe('v2 Kraftblöcke (Spec 2026-10-10)', () => {
    it('HERO_BLOCK_ORDER enthält die v2-Kraftblöcke vor plyo', () => {
        const lower = HERO_BLOCK_ORDER.indexOf('lower_strength');
        const upper = HERO_BLOCK_ORDER.indexOf('upper_strength');
        expect(lower).toBeGreaterThan(-1);
        expect(upper).toBeGreaterThan(-1);
        expect(lower).toBeLessThan(HERO_BLOCK_ORDER.indexOf('plyo'));
        expect(upper).toBeLessThan(HERO_BLOCK_ORDER.indexOf('plyo'));
    });
});
