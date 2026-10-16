import { describe, it, expect } from 'vitest';
import { diffSlots, flapSequence, flipScale, startDelay, FlapEngine, STEP, FLAP_MIN, FLAP_MAX } from '../src/flap';
import { slotsOf } from '../src/board';
import { layoutSlide } from '../src/layout';
import { Frame } from '../src/grid';
import type { Deck } from '../src/deck';
import demo from '../src/decks/demo.json';

const deck = demo as Deck;

describe('slot diffing', () => {
  const a = slotsOf(layoutSlide(deck, 0));
  const b = slotsOf(layoutSlide(deck, 1));
  const { flip, keep } = diffSlots(a, b);

  it('keeps the brand still', () => {
    const brand = [...b.values()].filter((s) => s.row === 19 && s.col >= 26 && s.col < 70);
    expect(brand.length).toBe(9);
    for (const s of brand) expect(keep).toContain(s.key);
  });
  it('flips only the changed page digit', () => {
    const pg = [...b.values()].filter((s) => s.row === 19 && s.col > 300).sort((x, y) => x.col - y.col);
    const flipped = pg.filter((s) => flip.includes(s.key)).map((s) => s.ch);
    expect(pg.map((s) => s.ch).join('')).toBe('PG 02/07');
    expect(flipped).toEqual(['2']);
  });
  it('flips slots that leave the slide to blank', () => {
    const gone = [...a.keys()].filter((k) => !b.has(k));
    expect(gone.length).toBeGreaterThan(0);
    for (const k of gone) expect(flip).toContain(k);
  });
});

describe('flap sequence', () => {
  it('cycles 6 to 12 random glyphs then lands on the target', () => {
    for (let i = 0; i < 50; i++) {
      const s = flapSequence('Q');
      expect(s.length - 1).toBeGreaterThanOrEqual(FLAP_MIN);
      expect(s.length - 1).toBeLessThanOrEqual(FLAP_MAX);
      expect(s.at(-1)).toBe('Q');
      expect(s.slice(0, -1).every((c) => /[A-Z0-9]/.test(c))).toBe(true);
    }
  });
  it('staggers by row and character index', () => {
    expect(startDelay(0, 0)).toBe(0);
    expect(startDelay(216, 0)).toBe(260);
    expect(startDelay(0, 3)).toBe(102);
  });
});

describe('flip disc', () => {
  it('keeps dots on in both states at full size', () => {
    expect(flipScale(true, true, 3, 7, 10)).toEqual({ on: 'new', scale: 1 });
  });
  it('shrinks the old dot to 0, then grows the new one', () => {
    expect(flipScale(true, false, 0, 7, 0).scale).toBe(1);
    expect(flipScale(false, true, 0, 7, STEP / 2).scale).toBe(1);
    expect(flipScale(false, true, 0, 7, STEP / 8).on).toBe('none');
  });
  it('starts lower glyph rows later', () => {
    const top = flipScale(true, false, 0, 7, 10).scale;
    const bottom = flipScale(true, false, 6, 7, 10).scale;
    expect(bottom).toBeGreaterThan(top);
  });
});

describe('engine', () => {
  it('settles on the target slide', () => {
    const e = new FlapEngine();
    const next = slotsOf(layoutSlide(deck, 1));
    e.goto(next, 100, 0);
    const f = new Frame();
    expect(e.render(f, 50)).toBe(true);
    const end = e.endTime();
    f.clear();
    expect(e.render(f, end + 2000)).toBe(false);
  });
  it('swaps instantly with reduced motion', () => {
    const e = new FlapEngine();
    e.reduced = true;
    e.goto(slotsOf(layoutSlide(deck, 0)), 58, 1000);
    expect(e.render(new Frame(), 1000)).toBe(false);
  });
});
