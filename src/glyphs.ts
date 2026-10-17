// Dot faces. Every character is a bitmap of lit dots; nothing on the board is drawn with a font at runtime.
// - doto: Doto sampled on its own 5 x 9 dot grid (7 cap rows + 2 descender rows), see src/glyphs.json.
// - mini: a 3 x 5 face for labels and chrome (uppercase).

import dotoTable from './glyphs.json';
import iconTable from './icons.json';
import { TYPE, type Role } from './tokens';

const F3X5 = `
A 010 101 111 101 101
B 110 101 110 101 110
C 011 100 100 100 011
D 110 101 101 101 110
E 111 100 110 100 111
F 111 100 110 100 100
G 011 100 101 101 011
H 101 101 111 101 101
I 111 010 010 010 111
J 001 001 001 101 010
K 101 101 110 101 101
L 100 100 100 100 111
M 101 111 111 101 101
N 110 101 101 101 101
O 010 101 101 101 010
P 110 101 110 100 100
Q 010 101 101 110 011
R 110 101 110 101 101
S 011 100 010 001 110
T 111 010 010 010 010
U 101 101 101 101 111
V 101 101 101 101 010
W 101 101 111 111 101
X 101 101 010 101 101
Y 101 101 010 010 010
Z 111 001 010 100 111
0 111 101 101 101 111
1 010 110 010 010 111
2 110 001 010 100 111
3 110 001 010 001 110
4 101 101 111 001 001
5 111 100 110 001 110
6 011 100 111 101 111
7 111 001 010 010 010
8 111 101 111 101 111
9 111 101 111 001 110
/ 001 001 010 100 100
. 000 000 000 000 010
, 000 000 000 010 100
- 000 000 111 000 000
+ 000 010 111 010 000
: 000 010 000 010 000
; 000 010 000 010 100
% 101 001 010 100 101
> 100 010 001 010 100
< 001 010 100 010 001
& 010 101 010 101 011
' 010 010 000 000 000
" 101 101 000 000 000
( 001 010 010 010 001
) 100 010 010 010 100
? 110 001 010 000 010
! 010 010 010 000 010
· 000 000 010 000 000
@ 111 101 111 100 011
$ 011 110 010 011 110
# 101 111 101 111 101
* 000 101 010 101 000
= 000 111 000 111 000
_ 000 000 000 000 111
→ 000 010 111 010 000
`;

export interface Bitmap { w: number; h: number; rows: boolean[][] }

function parseMini(src: string): Map<string, Bitmap> {
  const out = new Map<string, Bitmap>();
  for (const line of src.trim().split('\n')) {
    const [ch, ...rows] = line.trim().split(/\s+/);
    if (rows.length !== 5 || rows.some((r) => r.length !== 3)) throw new Error(`Bad glyph ${ch}`);
    out.set(ch, { w: 3, h: 5, rows: rows.map((r) => [...r].map((b) => b === '1')) });
  }
  return out;
}

const B32 = '0123456789abcdefghijklmnopqrstuv';
function parseDoto(table: Record<string, string>): Map<string, Bitmap> {
  const out = new Map<string, Bitmap>();
  for (const [ch, code] of Object.entries(table)) {
    if (ch === '_about') continue;
    const rows = [...code].map((c) => { const v = B32.indexOf(c); return [16, 8, 4, 2, 1].map((b) => (v & b) !== 0); });
    out.set(ch, { w: 5, h: 9, rows });
  }
  return out;
}

const MINI = parseMini(F3X5);
const DOTO = parseDoto(dotoTable as Record<string, string>);

/** Typographic quotes and dashes fold to what each face has. */
const FOLD: Record<string, string> = { '’': "'", '‘': "'", '“': '"', '”': '"', '–': '-', '—': '-', '…': '...' };

/** Glyph bitmap for a role, or null for a blank (space or unknown). */
export function bitmap(role: Role, ch: string): Bitmap | null {
  const c = FOLD[ch] ?? ch;
  if (TYPE[role].face === 'mini') return MINI.get(c.toUpperCase()) ?? null;
  return DOTO.get(c) ?? DOTO.get(c.toUpperCase()) ?? null;
}

/** The characters a role can draw (for sanitizing and the deck check). */
export function canDraw(role: Role, ch: string): boolean {
  return ch === ' ' || bitmap(role, ch) !== null;
}

/** The cursor: a solid 5 x 7 block in the role's dot scale. */
export const CURSOR: Bitmap = { w: 5, h: 7, rows: Array.from({ length: 7 }, () => Array(5).fill(true)) };

/** Dot icons from the Figma kit: 15 x 15. Name with a trailing * is the Fill style. */
export function icon(name: string): Bitmap | null {
  const hex = (iconTable as Record<string, string>)[name];
  if (!hex || name === '_about') return null;
  const rows: boolean[][] = [];
  for (let i = 0; i < 15; i++) {
    const v = parseInt(hex.slice(i * 4, i * 4 + 4), 16);
    rows.push(Array.from({ length: 15 }, (_, x) => (v & (1 << (14 - x))) !== 0));
  }
  return { w: 15, h: 15, rows };
}

export const ICON_NAMES = Object.keys(iconTable).filter((k) => k !== '_about');

/** Greedy word wrap to a fixed number of characters per line. */
export function wrap(text: string, perLine: number, maxLines = Infinity): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let cur = '';
    for (let word of words) {
      while (word.length > perLine) {
        if (cur) { out.push(cur); cur = ''; }
        out.push(word.slice(0, perLine));
        word = word.slice(perLine);
      }
      if (!cur) cur = word;
      else if (cur.length + 1 + word.length <= perLine) cur += ' ' + word;
      else { out.push(cur); cur = word; }
    }
    if (cur) out.push(cur);
  }
  return out.slice(0, maxLines);
}
