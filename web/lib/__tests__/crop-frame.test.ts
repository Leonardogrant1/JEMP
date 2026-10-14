import { frameCropDrawParams } from '../crop-frame';

describe('frameCropDrawParams', () => {
    it('passes a clean in-bounds crop through (rounded)', () => {
        expect(frameCropDrawParams({ x: 100.4, y: 50.6, width: 400.2, height: 400.2 }, 1920, 1080))
            .toEqual({ sx: 100, sy: 51, sWidth: 400, sHeight: 400, dSize: 1024 });
    });

    it('clamps negative origins from subpixel drag', () => {
        expect(frameCropDrawParams({ x: -2, y: -1, width: 500, height: 500 }, 1920, 1080))
            .toEqual({ sx: 0, sy: 0, sWidth: 500, sHeight: 500, dSize: 1024 });
    });

    it('clamps overshooting regions to the video bounds', () => {
        expect(frameCropDrawParams({ x: 1800, y: 900, width: 500, height: 500 }, 1920, 1080))
            .toEqual({ sx: 1800, sy: 900, sWidth: 120, sHeight: 180, dSize: 1024 });
    });

    it('never produces zero-size regions', () => {
        const p = frameCropDrawParams({ x: 1919, y: 1079, width: 0, height: 0 }, 1920, 1080);
        expect(p.sWidth).toBeGreaterThanOrEqual(1);
        expect(p.sHeight).toBeGreaterThanOrEqual(1);
    });

    it('honors a custom output size', () => {
        expect(frameCropDrawParams({ x: 0, y: 0, width: 100, height: 100 }, 200, 200, 512).dSize).toBe(512);
    });
});
