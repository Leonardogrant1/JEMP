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
