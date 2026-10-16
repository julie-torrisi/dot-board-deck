import { describe, it, expect } from 'vitest';
import { devicePitch, geometry, COLS, ROWS } from '../src/grid';

describe('devicePitch', () => {
  it('is 5 at 1920 x 1080, 1x', () => expect(devicePitch(1920, 1080, 1)).toBe(5));
  it('is 10 at 1920 x 1080, 2x', () => expect(devicePitch(1920, 1080, 2)).toBe(10));
  it('is 3 at 1280 x 720, 1x', () => expect(devicePitch(1280, 720, 1)).toBe(3));
  it('never drops below 2', () => expect(devicePitch(300, 200, 1)).toBe(2));
});

describe('geometry', () => {
  it('matches the spec dot at 1920 x 1080: 4px dot, 1px gap', () => {
    const g = geometry(1920, 1080, 1);
    expect(g.dot).toBe(4);
    expect(g.pitch - g.dot).toBe(1);
    expect(g.x0).toBe(0);
    expect(g.y0).toBe(0);
  });
  it('letterboxes with whole pixels', () => {
    const g = geometry(1440, 900, 1);
    expect(Number.isInteger(g.x0) && Number.isInteger(g.y0)).toBe(true);
    expect(g.x0 * 2 + COLS * g.pitch).toBeLessThanOrEqual(g.width);
    expect(g.y0 * 2 + ROWS * g.pitch).toBeLessThanOrEqual(g.height);
  });
});
