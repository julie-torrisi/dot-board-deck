import { describe, it, expect } from 'vitest';
import { bitmap, icon, ICON_NAMES, wrap, canDraw } from '../src/glyphs';
import { Frame, Ink } from '../src/grid';
import { drawChar } from '../src/board';

describe('dot faces', () => {
  it('draws every printable ASCII character in body (Doto)', () => {
    for (let c = 33; c < 127; c++) expect(bitmap('body', String.fromCharCode(c)), String.fromCharCode(c)).not.toBeNull();
  });
  it('gives lowercase descenders two extra rows', () => {
    const g = bitmap('body', 'g')!;
    expect(g.h).toBe(9);
    expect(g.rows[8].some(Boolean)).toBe(true);
  });
  it('covers the label characters the chrome uses', () => {
    for (const ch of 'ABCXYZ0123456789 ·:,.&/-()') expect(canDraw('label', ch), ch).toBe(true);
  });
  it('folds typographic quotes', () => expect(bitmap('body', '’')).toEqual(bitmap('body', "'")));
  it('scales one Doto dot to a filled block of board dots', () => {
    const f = new Frame();
    drawChar(f, 'hero', 'I', 0, 0, Ink.Ink);
    const lit = f.ink.reduce((n, v) => n + (v ? 1 : 0), 0);
    const dots = bitmap('hero', 'I')!.rows.flat().filter(Boolean).length;
    expect(lit).toBe(dots * 9);
  });
});

describe('dot icons', () => {
  it('decodes all 152 icons from the Figma kit', () => {
    expect(ICON_NAMES.length).toBe(152);
    for (const n of ICON_NAMES) { const b = icon(n)!; expect(b.rows.length).toBe(15); expect(b.rows.flat().some(Boolean)).toBe(true); }
  });
});

describe('wrap', () => {
  it('wraps on words', () => expect(wrap('ONE TWO THREE', 7)).toEqual(['ONE TWO', 'THREE']));
  it('keeps paragraph breaks', () => expect(wrap('A\nB', 10)).toEqual(['A', 'B']));
});
