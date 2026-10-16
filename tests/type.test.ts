import { describe, it, expect } from 'vitest';
import { advance, capRows, textWidth, offsets, display } from '../src/type';
import { THEMES } from '../src/tokens';

describe('type on the grid', () => {
  it('lands Doto display advances on whole cells', () => {
    expect(advance('h1')).toBeCloseTo(12);
    expect(advance('hero')).toBeCloseTo(18);
  });
  it('keeps the approved cap heights', () => {
    expect(capRows('hero')).toBeCloseTo(21);
    expect(capRows('h1')).toBeCloseTo(14);
    expect(capRows('body')).toBeCloseTo(7, 0);
  });
  it('uppercases display and labels, keeps body as written', () => {
    expect(display('Hello', 'h1')).toBe('HELLO');
    expect(display('Hello', 'label')).toBe('HELLO');
    expect(display('Hello', 'body')).toBe('Hello');
  });
  it('measures proportional Inter text', () => {
    expect(textWidth('iiii', 'body')).toBeLessThan(textWidth('MMMM', 'body'));
    const o = offsets('ab', 'body');
    expect(o[0]).toBe(0);
    expect(o[1]).toBeGreaterThan(0);
  });
});

describe('Cadence Kit tokens', () => {
  it('uses the Cadence red as the one signal color', () => {
    expect(THEMES.dark.signal).toBe('#ff5a60');
    expect(THEMES.light.signal).toBe('#d71921');
  });
});
