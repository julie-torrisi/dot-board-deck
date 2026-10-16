// Split-flap characters with flip-disc dots.

import { Frame, Ink, ROWS } from './grid';
import { ROLES, glyph, type Role } from './glyphs';
import type { Slot } from './board';

export const STEP = 78; // ms per glyph change
export const FLAP_MIN = 6;
export const FLAP_MAX = 12;
export const ROW_STAGGER = 260; // ms across the full screen height
export const CHAR_STAGGER = 34; // ms per character index
export const PROGRESS_DOT_MS = 2.5;
export const CURSOR_MS = 530;

const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

interface Face { ch: string; ink: Ink }
interface Anim {
  role: Role; col: number; row: number; cursor?: boolean;
  from: Face; to: Face; seq: string[]; start: number;
}

/** Which slot keys flip when going from one slide to the next. */
export function diffSlots(prev: Map<string, Slot>, next: Map<string, Slot>): { flip: string[]; keep: string[] } {
  const flip: string[] = [];
  const keep: string[] = [];
  for (const [key, n] of next) {
    const p = prev.get(key);
    if (p && p.ch === n.ch && p.ink === n.ink) keep.push(key);
    else flip.push(key);
  }
  for (const key of prev.keys()) if (!next.has(key)) flip.push(key); // flips to blank
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

/** Character showing at time t, for interrupting a flap mid-sequence. */
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

  goto(next: Map<string, Slot>, progressTo: number, now: number) {
    const { flip } = diffSlots(this.slots, next);
    const prevAnims = this.anims;
    this.anims = new Map();
    // carry over unchanged slots, still mid-flap or settled
    for (const [key, slot] of next) {
      if (flip.includes(key)) continue;
      const a = prevAnims.get(key);
      this.anims.set(key, a ?? this.settled(slot, now));
    }
    for (const key of flip) {
      const n = next.get(key);
      const p = this.slots.get(key);
      const prevAnim = prevAnims.get(key);
      const from = prevAnim ? showing(prevAnim, now) : p ? { ch: p.ch, ink: p.ink } : { ch: ' ', ink: Ink.Ink };
      const src = n ?? p!;
      const to: Face = n ? { ch: n.ch, ink: n.ink } : { ch: ' ', ink: from.ink };
      const sameChar = from.ch === to.ch;
      const seq = this.reduced ? [to.ch] : sameChar ? [to.ch] : flapSequence(to.ch);
      const start = this.reduced ? now - STEP * 2 : now + startDelay(src.row, n?.index ?? p?.index ?? 0);
      this.anims.set(key, { role: src.role, col: src.col, row: src.row, cursor: n?.cursor, from, to, seq, start });
    }
    const cur = this.progressAt(now);
    this.progress = { from: cur, to: progressTo, start: now };
    if (this.reduced) this.progress.from = progressTo;
    this.slots = next;
    this.settledAt = this.endTime();
  }

  private settled(slot: Slot, now: number): Anim {
    const f = { ch: slot.ch, ink: slot.ink };
    return { role: slot.role, col: slot.col, row: slot.row, cursor: slot.cursor, from: f, to: f, seq: [slot.ch], start: now - STEP * 2 };
  }

  /** When the last slot lands. */
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

  /** Draw every slot at time t. Returns true while anything is still moving. */
  render(frame: Frame, t: number): boolean {
    let moving = false;
    for (const a of this.anims.values()) {
      const e = t - a.start;
      const total = a.seq.length * STEP;
      if (e >= total) {
        if (a.cursor && a.to.ch !== ' ') {
          const since = Math.max(0, t - Math.max(a.start + total, this.settledAt));
          if (Math.floor(since / CURSOR_MS) % 2 === 1) continue;
        }
        drawFace(frame, a.role, a.col, a.row, a.to);
        continue;
      }
      moving = true;
      if (e < 0) { drawFace(frame, a.role, a.col, a.row, a.from); continue; }
      const k = Math.floor(e / STEP);
      const prev = k === 0 ? a.from : { ch: a.seq[k - 1], ink: a.to.ink };
      const cur = { ch: a.seq[k], ink: a.to.ink };
      drawFlip(frame, a.role, a.col, a.row, prev, cur, e - k * STEP);
    }
    const p = this.progressAt(t);
    for (let i = 0; i < p; i++) frame.set(19 + i, 192, Ink.Ink);
    if (p !== this.progress.to) moving = true;
    return moving;
  }
}

function drawFace(frame: Frame, role: Role, col: number, row: number, f: Face) {
  const { face, scale } = ROLES[role];
  const g = glyph(face, f.ch);
  if (!g) return;
  for (let y = 0; y < face.h; y++) for (let x = 0; x < face.w; x++) {
    if (!g[y][x]) continue;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) frame.set(col + x * scale + dx, row + y * scale + dy, f.ink);
  }
}

/** One step of a flip. Each changing dot shrinks to 0 then grows into its new state; the flip travels down the glyph. */
export function flipScale(oldOn: boolean, newOn: boolean, y: number, h: number, tInStep: number): { on: 'old' | 'new' | 'none'; scale: number } {
  if (oldOn && newOn) return { on: 'new', scale: 1 };
  if (!oldOn && !newOn) return { on: 'none', scale: 0 };
  const half = STEP / 2;
  const delay = (y / h) * half;
  const u = Math.min(1, Math.max(0, (tInStep - delay) / half));
  if (u < 0.5) return oldOn ? { on: 'old', scale: 1 - 2 * u } : { on: 'none', scale: 0 };
  return newOn ? { on: 'new', scale: 2 * u - 1 } : { on: 'none', scale: 0 };
}

function drawFlip(frame: Frame, role: Role, col: number, row: number, prev: Face, cur: Face, tInStep: number) {
  const { face, scale } = ROLES[role];
  const go = glyph(face, prev.ch);
  const gn = glyph(face, cur.ch);
  for (let y = 0; y < face.h; y++) for (let x = 0; x < face.w; x++) {
    const r = flipScale(!!go?.[y][x], !!gn?.[y][x], y, face.h, tInStep);
    if (r.on === 'none' || r.scale <= 0) continue;
    const ink = r.on === 'old' ? prev.ink : cur.ink;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) frame.set(col + x * scale + dx, row + y * scale + dy, ink, r.scale);
  }
}
