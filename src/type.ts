// Text measurement. Both faces are monospaced on the dot grid, so every position is a whole cell.

import { TYPE, type Role } from './tokens';

export function display(text: string, role: Role): string {
  return TYPE[role].upper ? text.toUpperCase() : text;
}

/** Dot columns per glyph before the gap, in face dots. */
const faceW = (role: Role) => (TYPE[role].face === 'mini' ? 3 : 5);
const faceCap = (role: Role) => (TYPE[role].face === 'mini' ? 5 : 7);

/** Cells advanced per character, including the 1-dot gap. */
export function advance(role: Role): number {
  return (faceW(role) + 1) * TYPE[role].scale;
}

export function charWidth(_ch: string, role: Role): number { return advance(role); }

/** Left offset of every character, in cells. */
export function offsets(text: string, role: Role): number[] {
  return [...display(text, role)].map((_, i) => i * advance(role));
}

/** Text width in cells (trailing gap removed). */
export function textWidth(text: string, role: Role): number {
  const n = [...display(text, role)].length;
  return n ? n * advance(role) - TYPE[role].scale : 0;
}

/** Cap height in rows. */
export function capRows(role: Role): number {
  return faceCap(role) * TYPE[role].scale;
}

export const textHeight = capRows;

/** How many characters fit in a width of cells. */
export function perLine(role: Role, width: number): number {
  return Math.max(1, Math.floor((width + TYPE[role].scale) / advance(role)));
}

/** Rows from one line to the next. */
export function lead(role: Role): number { return TYPE[role].lead; }
