// Split-flap characters. Display type cycles random glyphs before landing; every changing
// character flips like a flip-disc board: its dots fold away, then the new dots unfold.

import { Frame, Ink, ROWS } from './grid';
import { TYPE, type Role } from './tokens';
import { drawChar, type Slot } from './board';
import { PROGRESS, MARGIN_L } from './layout';

export const STEP = 78; // ms per glyph change
export const FLAP_MIN = 6;
export const FLAP_MAX = 12;
export const ROW_STAGGER = 260;
export const CHAR_STAGGER = 34;
export const PROGRESS_DOT_MS = 2.5;
export const CURSOR_MS = 530;

const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

interface Face { ch: string; ink: Ink }
interface Anim { role: Role; x: number; row: number; cursor?: boolean; from: Face; to: Face; seq: string[]; start: number }

export function diffSlots(prev: Map<string, Slot>, next: Map<string, Slot>): { flip: string[]; keep: string[] } {
  const flip: string[] = [];
  const keep: string[] = [];
  for (const [key, n] of next) {
    const p = prev.get(key);
    if (p && p.ch === n.ch && p.ink === n.ink) keep.push(key);
    else flip.push(key);
  }
  for (const key of prev.keys()) if (!next.has(key)) flip.push(key);
  return { flip, keep };
}

/** 6 to 12 random glyphs, then the target. */
export function flapSequence(target: string, rand: () => number = Math.random): string[] {
  const n = FLAP_MIN + Math.floor(rand() * (FLAP_MAX - FLAP_MIN + 1));
  const seq: string[] = [];
  for (let i = 0; i < n; i++) seq.push(POOL[Math.floor(rand() * POOL.length)]);
  seq.push(target);
  return seq;
}

export function startDelay(row: number, charIndex: number): number {
  return (row / ROWS) * ROW_STAGGER + charIndex * CHAR_STAGGER;
}

/** Card flip within one step: the old face folds to 0, then the new face unfolds. */
export function flipScale(tInStep: number): { face: 'old' | 'new'; scale: number } {
  const u = Math.min(1, Math.max(0, tInStep / STEP));
  return u < 0.5 ? { face: 'old', scale: 1 - 2 * u } : { face: 'new', scale: 2 * u - 1 };
}

function showing(a: Anim, t: number): Face {
  const e = t - a.start;
  if (e < 0) return a.from;
  const k = Math.floor(e / STEP);
  if (k >= a.seq.length) return a.to;
  return { ch: a.seq[k], ink: a.to.ink };
}

export class FlapEngine {
  private anims = new Map<string, Anim>();
  private slots = new Map<string, Slot>();
  private progress = { from: 0, to: 0, start: 0 };
  private settledAt = 0;
  reduced = false;

  /** Forget everything on the board, so the next slide flaps in from blank. */
  reset(now: number) {
    this.anims = new Map();
    this.slots = new Map();
    this.progress = { from: 0, to: 0, start: now };
  }

  goto(next: Map<string, Slot>, progressTo: number, now: number) {
    const { flip } = diffSlots(this.slots, next);
    const flipSet = new Set(flip);
    const prevAnims = this.anims;
    this.anims = new Map();
    for (const [key, slot] of next) {
      if (flipSet.has(key)) continue;
      this.anims.set(key, prevAnims.get(key) ?? this.settled(slot, now));
    }
    for (const key of flip) {
      const n = next.get(key);
      const p = this.slots.get(key);
      const prevAnim = prevAnims.get(key);
      const from = prevAnim ? showing(prevAnim, now) : p ? { ch: p.ch, ink: p.ink } : { ch: ' ', ink: Ink.Ink };
      const src = n ?? p!;
      const to: Face = n ? { ch: n.ch, ink: n.ink } : { ch: ' ', ink: from.ink };
      // display type cycles like a split-flap board; body and labels just flip once
      const cycles = TYPE[src.role].cycles && !src.cursor && from.ch !== to.ch && to.ch !== ' ';
      const seq = this.reduced || !cycles ? [to.ch] : flapSequence(to.ch);
      const start = this.reduced ? now - STEP * 2 : now + startDelay(src.row, n?.index ?? p?.index ?? 0);
      this.anims.set(key, { role: src.role, x: src.x, row: src.row, cursor: src.cursor, from, to, seq, start });
    }
    const cur = this.progressAt(now);
    this.progress = { from: this.reduced ? progressTo : cur, to: progressTo, start: now };
    this.slots = next;
    this.settledAt = this.endTime();
  }

  private settled(slot: Slot, now: number): Anim {
    const f = { ch: slot.ch, ink: slot.ink };
    return { role: slot.role, x: slot.x, row: slot.row, cursor: slot.cursor, from: f, to: f, seq: [slot.ch], start: now - STEP * 2 };
  }

  endTime(): number {
    let end = 0;
    for (const a of this.anims.values()) end = Math.max(end, a.start + a.seq.length * STEP);
    return end;
  }

  progressAt(t: number): number {
    const { from, to, start } = this.progress;
    const moved = Math.floor((t - start) / PROGRESS_DOT_MS);
    if (moved <= 0) return from;
    return to > from ? Math.min(to, from + moved) : Math.max(to, from - moved);
  }

  /** Draw every character as lit dots. Returns true while anything moves. */
  render(frame: Frame, t: number): boolean {
    let moving = false;
    const put = (a: Anim, f: Face, scaleY: number) => {
      if (f.ch === ' ') return;
      drawChar(frame, a.role, f.ch, a.x, a.row, f.ink, scaleY, a.cursor);
    };
    for (const a of this.anims.values()) {
      const e = t - a.start;
      const total = a.seq.length * STEP;
      if (e >= total) {
        if (a.cursor && a.to.ch !== ' ') {
          const since = Math.max(0, t - Math.max(a.start + total, this.settledAt));
          if (Math.floor(since / CURSOR_MS) % 2 === 1) continue;
        }
        put(a, a.to, 1);
        continue;
      }
      moving = true;
      if (e < 0) { put(a, a.from, 1); continue; }
      const k = Math.floor(e / STEP);
      const prev = k === 0 ? a.from : { ch: a.seq[k - 1], ink: a.to.ink };
      const cur = { ch: a.seq[k], ink: a.to.ink };
      const f = flipScale(e - k * STEP);
      put(a, f.face === 'old' ? prev : cur, f.scale);
    }
    const p = this.progressAt(t);
    for (let i = 0; i < p; i++) frame.set(MARGIN_L + i, PROGRESS.row, Ink.Dim);
    if (p !== this.progress.to) moving = true;
    return moving;
  }
}
