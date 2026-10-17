import { describe, it, expect } from 'vitest';
import { advance, capRows, textWidth, offsets, display, perLine } from '../src/type';
import { THEMES } from '../src/tokens';

describe('type on the grid', () => {
  it('advances every role on whole cells', () => {
    expect(advance('hero')).toBe(18);
    expect(advance('h1')).toBe(12);
    expect(advance('body')).toBe(6);
    expect(advance('label')).toBe(4);
  });
  it('keeps the cap heights', () => {
    expect(capRows('hero')).toBe(21);
    expect(capRows('h1')).toBe(14);
    expect(capRows('body')).toBe(7);
    expect(capRows('label')).toBe(5);
  });
  it('uppercases display and labels, keeps body as written', () => {
    expect(display('Hello', 'h1')).toBe('HELLO');
    expect(display('Hello', 'label')).toBe('HELLO');
    expect(display('Hello', 'body')).toBe('Hello');
  });
  it('is monospaced, so widths are exact', () => {
    expect(textWidth('iiii', 'body')).toBe(textWidth('MMMM', 'body'));
    expect(textWidth('ABC', 'h1')).toBe(3 * 12 - 2);
    expect(offsets('ab', 'body')).toEqual([0, 6]);
  });
  it('fits 57 body characters across the content width', () => expect(perLine('body', 346)).toBe(57));
});

describe('Cadence Kit tokens', () => {
  it('uses the Cadence red as the one signal color', () => {
    expect(THEMES.dark.signal).toBe('#ff5a60');
    expect(THEMES.light.signal).toBe('#d71921');
  });
});
