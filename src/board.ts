// Turns laid-out items into slots (one per character) and lit cells.

import { Frame, Ink } from './grid';
import { FACE_5X7, glyph } from './glyphs';
import { startCol } from './layout';
import { display, offsets } from './type';
import type { Role } from './tokens';
import type { Item, ImageItem, InkName } from './deck';

export interface Slot { key: string; role: Role; x: number; row: number; ch: string; ink: Ink; index: number; cursor?: boolean }

export const inkOf = (name?: InkName) => (name === 'grey' ? Ink.Grey : name === 'signal' ? Ink.Signal : Ink.Ink);

/** Every character position becomes a slot keyed by role, x and row. */
export function slotsOf(items: Item[]): Map<string, Slot> {
  const slots = new Map<string, Slot>();
  for (const it of items) {
    if (it.t !== 'text') continue;
    const x0 = startCol(it);
    if (it.cursor) {
      const key = `cursor:${x0}:${it.row}`;
      slots.set(key, { key, role: it.role, x: x0, row: it.row, ch: '#', ink: inkOf(it.ink), index: 0, cursor: true });
      continue;
    }
    const chars = [...display(it.text, it.role)];
    const offs = offsets(it.text, it.role);
    chars.forEach((ch, i) => {
      const x = x0 + offs[i];
      const key = `${it.role}:${Math.round(x * 4)}:${it.row}`;
      slots.set(key, { key, role: it.role, x, row: it.row, ch, ink: inkOf(it.ink), index: i });
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

/** The blinking cursor stays a block of real dots (the 5x7 block at x2). */
export function drawCursor(frame: Frame, col: number, row: number, ink: Ink, scaleY = 1) {
  const g = glyph(FACE_5X7, '#')!;
  for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) {
    if (!g[y][x]) continue;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) frame.set(Math.round(col) + x * 2 + dx, row + y * 2 + dy, ink, scaleY);
  }
}
