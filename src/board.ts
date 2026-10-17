// Turns laid-out items into slots (one per character) and lit cells.

import { Frame, Ink } from './grid';
import { bitmap, icon, CURSOR, type Bitmap } from './glyphs';
import { startCol } from './layout';
import { display, offsets } from './type';
import { TYPE, type Role } from './tokens';
import type { Item, ImageItem, InkName, LinkItem } from './deck';

export interface Slot { key: string; role: Role; x: number; row: number; ch: string; ink: Ink; index: number; cursor?: boolean }

export const inkOf = (name?: InkName) =>
  name === 'grey' ? Ink.Grey : name === 'signal' ? Ink.Signal : name === 'dim' ? Ink.Dim : Ink.Ink;

/** Light a bitmap: each bitmap dot becomes a scale x scale block of board dots. */
export function stamp(frame: Frame, bmp: Bitmap, col: number, row: number, scale: number, ink: Ink, scaleY = 1) {
  for (let y = 0; y < bmp.h; y++) for (let x = 0; x < bmp.w; x++) {
    if (!bmp.rows[y][x]) continue;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      frame.set(col + x * scale + dx, row + y * scale + dy, ink, scaleY);
    }
  }
}

/** Draw one character of a role, or the cursor block. */
export function drawChar(frame: Frame, role: Role, ch: string, col: number, row: number, ink: Ink, scaleY = 1, cursor = false) {
  const bmp = cursor ? CURSOR : bitmap(role, ch);
  if (bmp) stamp(frame, bmp, Math.round(col), row, TYPE[role].scale, ink, scaleY);
}

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
      if (ch === ' ') return;
      const x = x0 + offs[i];
      const key = `${it.role}:${x}:${it.row}`;
      slots.set(key, { key, role: it.role, x, row: it.row, ch, ink: inkOf(it.ink), index: i });
    });
  }
  return slots;
}

/** Static cells that are not characters: blocks, rules and icons. */
export function staticsOf(items: Item[], frame: Frame) {
  for (const it of items) {
    if (it.t === 'block') {
      for (let r = 0; r < it.h; r++) for (let c = 0; c < it.w; c++) frame.set(it.col + c, it.row + r, inkOf(it.ink));
    } else if (it.t === 'rule') {
      for (let c = 0; c < it.w; c += 2) frame.set(it.col + c, it.row, inkOf(it.ink ?? 'dim'));
    } else if (it.t === 'icon') {
      const bmp = icon(it.name);
      if (bmp) stamp(frame, bmp, it.col, it.row, it.scale ?? 1, inkOf(it.ink));
    }
  }
}

/** Kept for older callers. */
export const blocksOf = staticsOf;

export const imagesOf = (items: Item[]) => items.filter((i): i is ImageItem => i.t === 'image');
export const linksOf = (items: Item[]) => items.filter((i): i is LinkItem => i.t === 'link');
