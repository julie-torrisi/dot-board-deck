import { describe, it, expect } from 'vitest';
import { chrome, layoutSlide, startCol, progressLength, wallCells, overflow, fits } from '../src/layout';
import { textWidth } from '../src/glyphs';
import type { Deck, TextItem } from '../src/deck';
import demo from '../src/decks/demo.json';

const deck = demo as Deck;

describe('chrome', () => {
  it('places the page number right-aligned to col 365', () => {
    const items = chrome(deck, deck.slides[0], 0, 6) as TextItem[];
    const pg = items.find((i) => i.t === 'text' && i.text.startsWith('PG'))!;
    expect(pg.text).toBe('PG 01/06');
    expect(startCol(pg) + textWidth(pg.text, 'label')).toBe(365);
  });
  it('reads 100% on the last slide', () => {
    const items = chrome(deck, deck.slides[0], 5, 6) as TextItem[];
    expect(items.some((i) => i.t === 'text' && i.text === '100% READ')).toBe(true);
  });
  it('fills the progress bar to 346 on the last slide', () => {
    expect(progressLength(5, 6)).toBe(346);
    expect(progressLength(0, 6)).toBe(58);
  });
});

describe('spec positions', () => {
  it('puts the boot cursor at col 91, row 106', () => {
    const cursor = layoutSlide(deck, 0).find((i) => i.t === 'text' && i.cursor) as TextItem;
    expect([cursor.col, cursor.row]).toEqual([91, 106]);
  });
  it('puts the EOF cursor at col 247, row 82', () => {
    const last = deck.slides.findIndex((s) => s.template === 'eof');
    const cursor = layoutSlide(deck, last).find((i) => i.t === 'text' && i.cursor) as TextItem;
    expect([cursor.col, cursor.row]).toEqual([247, 82]);
  });
  it('right-aligns departure statuses to col 365', () => {
    const i = deck.slides.findIndex((s) => s.template === 'departures');
    const statuses = layoutSlide(deck, i).filter((it) => it.t === 'text' && it.role === 'h1' && it.align === 'right') as TextItem[];
    expect(statuses.length).toBe(4);
    for (const s of statuses) expect(startCol(s) + textWidth(s.text, 'h1')).toBe(365);
  });
});

describe('wall', () => {
  it('keeps every screen inside the content area', () => {
    const cells = wallCells(Array.from({ length: 9 }, (_, i) => ({ src: `${i}.png`, alt: '' })), 62, 116);
    for (const c of cells) {
      if (c.t !== 'image') continue;
      expect(c.col).toBeGreaterThanOrEqual(19);
      expect(c.col + c.cols).toBeLessThanOrEqual(365);
      expect(c.row + c.rows).toBeLessThanOrEqual(62 + 116);
    }
  });
});

describe('overflow', () => {
  it('finds nothing in the demo deck', () => expect(overflow(deck)).toEqual([]));
  it('fits 28 H1 characters per line from the margin', () => expect(fits('h1')).toBe(28));
});
