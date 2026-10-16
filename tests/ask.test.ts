import { describe, it, expect } from 'vitest';
import { fitReply, validInput, RateLimiter, systemPrompt, CANNED } from '../api/_shared';

describe('fitReply', () => {
  it('uppercases and fits 3 lines of 23', () => {
    const out = fitReply('Systems first, screens second. Every signal earns its interruption, always and forever.');
    const lines = out.split('\n');
    expect(lines.length).toBeLessThanOrEqual(3);
    expect(lines.every((l) => l.length <= 23 && l === l.toUpperCase())).toBe(true);
  });
  it('removes em dashes and unsupported characters', () => {
    expect(fitReply('calm \u2014 curious & kind')).toBe('CALM, CURIOUS KIND');
  });
  it('falls back to the canned reply when nothing is left', () => {
    expect(fitReply('\u2014\u2014 @@@')).toBe(CANNED.replace(/\n/g, ''));
  });
});

describe('validInput', () => {
  it('accepts short prompts and rejects long or empty ones', () => {
    expect(validInput(' hello ')).toBe('hello');
    expect(validInput('')).toBeNull();
    expect(validInput('x'.repeat(121))).toBeNull();
    expect(validInput(42)).toBeNull();
  });
});

describe('RateLimiter', () => {
  it('blocks after the limit and resets after the window', () => {
    const r = new RateLimiter(2, 1000);
    expect(r.allow('a', 0)).toBe(true);
    expect(r.allow('a', 1)).toBe(true);
    expect(r.allow('a', 2)).toBe(false);
    expect(r.allow('b', 2)).toBe(true);
    expect(r.allow('a', 2000)).toBe(true);
  });
});

describe('systemPrompt', () => {
  it('carries the bio and the no em dash rule', () => {
    const p = systemPrompt('BIO TEXT');
    expect(p).toContain('BIO TEXT');
    expect(p).toContain('Never use em dashes');
  });
});
