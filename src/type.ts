// Text measurement from real font metrics (generated from the Doto and Inter font files),
// so layout is identical in the browser, in tests and in the deck check.

import metrics from './metrics.json';
import { TYPE, type Role } from './tokens';

type Table = { capHeight: number; widths: Record<string, number> };
const M = metrics as Record<string, Table>;

function table(role: Role): Table {
  const t = TYPE[role];
  return t.family === 'Doto' ? M.doto700 : t.weight >= 500 ? M.inter500 : M.inter400;
}

export function display(text: string, role: Role): string {
  return TYPE[role].upper ? text.toUpperCase() : text;
}

const DIGIT = /[0-9]/;

function natural(ch: string, role: Role): number {
  return table(role).widths[ch] ?? table(role).widths['n'] ?? 0.55;
}

/** Advance of one character in cells. Digits are tabular, so counters and page numbers don't shift. */
export function charWidth(ch: string, role: Role): number {
  const t = TYPE[role];
  const w = DIGIT.test(ch) ? natural('0', role) : natural(ch, role);
  return (w + t.tracking) * t.size;
}

/** Horizontal nudge that centers a narrow digit inside its tabular slot, in cells. */
export function nudge(ch: string, role: Role): number {
  if (!DIGIT.test(ch)) return 0;
  return ((natural('0', role) - natural(ch, role)) / 2) * TYPE[role].size;
}

/** Left offset of every character, in cells, relative to the text start. */
export function offsets(text: string, role: Role): number[] {
  const out: number[] = [];
  let x = 0;
  for (const ch of display(text, role)) { out.push(x); x += charWidth(ch, role); }
  return out;
}

/** Text width in cells (trailing tracking removed). */
export function textWidth(text: string, role: Role): number {
  const s = display(text, role);
  if (!s.length) return 0;
  let x = 0;
  for (const ch of s) x += charWidth(ch, role);
  return x - TYPE[role].tracking * TYPE[role].size;
}

/** Cap height in rows: where the baseline sits below the item's row. */
export function capRows(role: Role): number {
  return table(role).capHeight * TYPE[role].size;
}

/** Advance per character for monospaced display roles (Doto), in cells. */
export function advance(role: Role): number {
  return charWidth('M', role);
}

export function textHeight(role: Role): number { return capRows(role); }
