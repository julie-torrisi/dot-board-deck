// Turns laid-out items into slots (one per character) and lit cells.

import { COLS, Frame, Ink } from './grid';
import { ROLES, glyph, advance, type Role } from './glyphs';
import { startCol } from './layout';
import type { Item, ImageItem } from './deck';

export interface Slot { key: string; role: Role; col: number; row: number; ch: string; ink: Ink; index: number; cursor?: boolean }

export const inkOf = (name?: 'ink' | 'grey') => (name === 'grey' ? Ink.Grey : Ink.Ink);

/** Every character position becomes a slot keyed by (role, col, row). */
export function slotsOf(items: Item[]): Map<string, Slot> {
  const slots = new Map<string, Slot>();
  for (const it of items) {
    if (it.t !== 'text') continue;
    const c0 = startCol(it);
    const adv = advance(it.role);
    [...it.text.toUpperCase()].forEach((ch, i) => {
      const col = c0 + i * adv;
      const key = `${it.role}:${col}:${it.row}`;
      slots.set(key, { key, role: it.role, col, row: it.row, ch, ink: inkOf(it.ink), index: i, cursor: it.cursor });
    });
  }
  return slots;
}

/** Static cells that are not characters: blocks. */
export function blocksOf(items: Item[], frame: Frame) {
  for (const it of items) {
    if (it.t !== 'block') continue;
    for (let r = 0; r < it.h; r++) for (let c = 0; c < it.w; c++) frame.set(it.col + c, it.row + r, inkOf(it.ink));
  }
}

export const imagesOf = (items: Item[]) => items.filter((i): i is ImageItem => i.t === 'image');

/** Is the font pixel at (x, y) of this character lit? */
export function pixel(role: Role, ch: string, x: number, y: number): boolean {
  const g = glyph(ROLES[role].face, ch);
  return !!g && !!g[y]?.[x];
}

/** Draw a character into the frame. scaleFor(y) lets the flip vary by glyph row. */
export function drawChar(frame: Frame, role: Role, col: number, row: number, ch: string, ink: Ink, scaleFor?: (y: number) => number) {
  const { face, scale } = ROLES[role];
  const g = glyph(face, ch);
  if (!g) return;
  for (let y = 0; y < face.h; y++) {
    const s = scaleFor ? scaleFor(y) : 1;
    for (let x = 0; x < face.w; x++) {
      if (!g[y][x]) continue;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const c = col + x * scale + dx;
        if (c < COLS) frame.set(c, row + y * scale + dy, ink, s);
      }
    }
  }
}

export function drawProgress(frame: Frame, length: number, row = 192, col = 19) {
  for (let i = 0; i < length; i++) frame.set(col + i, row, Ink.Ink);
}
