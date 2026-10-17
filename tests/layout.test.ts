import { describe, it, expect } from 'vitest';
import { chrome, startCol, progressLength, wallCells, overflow, fits, extras, quoteItems } from '../src/layout';
import { textWidth } from '../src/type';
import type { Deck, TextItem, SlideSpec } from '../src/deck';
import demo from '../src/decks/demo.json';

const deck = demo as Deck;

describe('chrome', () => {
  it('puts the site and page number right-aligned to col 365', () => {
    const items = chrome(deck, deck.slides[0], 2, 6) as TextItem[];
    const pg = items.find((i) => i.t === 'text' && i.text.endsWith('· 03'))!;
    expect(startCol(pg) + textWidth(pg.text, 'label')).toBe(365);
  });
  it('fills the progress bar to 346 on the last slide', () => {
    expect(progressLength(5, 6)).toBe(346);
    expect(progressLength(0, 6)).toBe(58);
  });
});

describe('extras', () => {
  it('puts the why line in red above the links', () => {
    const s = { ...deck.slides[1], why: 'Why it matters: one line.', see: [{ label: 'Case study', href: 'https://example.com' }] } as SlideSpec;
    const { items, top } = extras(s);
    const why = items.find((i) => i.t === 'text' && i.ink === 'signal') as TextItem;
    const link = items.find((i) => i.t === 'link');
    expect(why).toBeTruthy();
    expect(link).toBeTruthy();
    expect(top).toBeLessThan(why.row);
  });
});

describe('carousel', () => {
  it('shows one quote at a time with position dots', () => {
    const q = [{ quote: 'One.', by: 'A' }, { quote: 'Two.', by: 'B' }];
    const a = quoteItems(q, 0).filter((i) => i.t === 'text') as TextItem[];
    const b = quoteItems(q, 1).filter((i) => i.t === 'text') as TextItem[];
    expect(a[0].text).toBe('One.');
    expect(b[0].text).toBe('Two.');
    expect(quoteItems(q, 0).filter((i) => i.t === 'block').length).toBe(2);
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

describe('wall columns', () => {
  it('puts portrait screens in one row when columns is set', () => {
    const cells = wallCells(Array.from({ length: 7 }, (_, i) => ({ src: `${i}.png`, alt: '' })), 62, 116, 7);
    const rows = new Set(cells.map((c) => (c.t === 'image' ? c.row : -1)));
    expect(rows.size).toBe(1);
    for (const c of cells) if (c.t === 'image') expect(c.col + c.cols).toBeLessThanOrEqual(365);
  });
});

describe('overflow', () => {
  it('finds nothing in the demo deck', () => expect(overflow(deck)).toEqual([]));
  it('fits 29 H1 characters per line from the margin', () => expect(fits('h1')).toBe(29));
  it('flags text that runs into the bottom band', () => {
    const d = { ...deck, slides: [{ id: 'x', label: 'X', template: 'cards', title: 'T', lead: 'word '.repeat(200), cards: [] }] } as unknown as Deck;
    expect(overflow(d).length).toBeGreaterThan(0);
  });
});
