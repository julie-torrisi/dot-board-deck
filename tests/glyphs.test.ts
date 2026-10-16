import { describe, it, expect } from 'vitest';
import { FACE_5X7, FACE_3X5, glyph, textWidth, textHeight, advance, sanitize, wrap } from '../src/glyphs';

describe('glyph tables', () => {
  it('has the full 5x7 set from the spec', () => {
    expect(FACE_5X7.glyphs.size).toBe(26 + 10 + 10);
  });
  it('has the full 3x5 set from the spec', () => {
    expect(FACE_3X5.glyphs.size).toBe(26 + 10 + 7);
  });
  it('looks up case-insensitively and returns null for unknown', () => {
    expect(glyph(FACE_5X7, 'a')).toEqual(glyph(FACE_5X7, 'A'));
    expect(glyph(FACE_5X7, '@')).toBeNull();
    expect(glyph(FACE_3X5, '!')).toBeNull();
  });
  it('draws A with the expected top row', () => {
    expect(glyph(FACE_5X7, 'A')![0]).toEqual([false, true, true, true, false]);
  });
});

describe('text math', () => {
  it('matches the spec width formula', () => {
    expect(textWidth('DESIGN', 'h1')).toBe((6 * 6 - 1) * 2); // 70
    expect(textWidth('01', 'hero')).toBe((2 * 6 - 1) * 3); // 33
    expect(textWidth('DOT/BOARD', 'label')).toBe(9 * 4 - 1); // 35
    expect(textWidth('', 'body')).toBe(0);
  });
  it('places the boot cursor right after DESIGN', () => {
    // spec: DESIGN at col 19, cursor at col 91 = 19 + 6 chars x 12
    expect(19 + 6 * advance('h1')).toBe(91);
  });
  it('matches the spec heights', () => {
    expect(textHeight('hero')).toBe(21);
    expect(textHeight('h1')).toBe(14);
    expect(textHeight('body')).toBe(7);
    expect(textHeight('label')).toBe(5);
  });
});

describe('sanitize and wrap', () => {
  it('uppercases and blanks unsupported characters', () => {
    expect(sanitize('hi—there @ 5%')).toBe('HI THERE   5 ');
  });
  it('wraps at 23 characters per line', () => {
    const lines = wrap('SYSTEMS ARE HOW SMALL TEAMS SHIP AT SCALE', 23);
    expect(lines).toEqual(['SYSTEMS ARE HOW SMALL', 'TEAMS SHIP AT SCALE']);
    expect(lines.every((l) => l.length <= 23)).toBe(true);
  });
  it('breaks words longer than a line', () => {
    expect(wrap('ABCDEFGHIJ', 4)).toEqual(['ABCD', 'EFGH', 'IJ']);
  });
  it('caps the line count', () => {
    expect(wrap('A B C D E F', 1, 3)).toEqual(['A', 'B', 'C']);
  });
});
