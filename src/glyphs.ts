// Bitmap faces. Rows top to bottom, 1 = lit. Unknown characters render blank.

const F5X7 = `
A 01110 10001 10001 10001 11111 10001 10001
B 11110 10001 10001 11110 10001 10001 11110
C 01110 10001 10000 10000 10000 10001 01110
D 11100 10010 10001 10001 10001 10010 11100
E 11111 10000 10000 11110 10000 10000 11111
F 11111 10000 10000 11110 10000 10000 10000
G 01110 10001 10000 10111 10001 10001 01111
H 10001 10001 10001 11111 10001 10001 10001
I 01110 00100 00100 00100 00100 00100 01110
J 00111 00010 00010 00010 00010 10010 01100
K 10001 10010 10100 11000 10100 10010 10001
L 10000 10000 10000 10000 10000 10000 11111
M 10001 11011 10101 10101 10001 10001 10001
N 10001 10001 11001 10101 10011 10001 10001
O 01110 10001 10001 10001 10001 10001 01110
P 11110 10001 10001 11110 10000 10000 10000
Q 01110 10001 10001 10001 10101 10010 01101
R 11110 10001 10001 11110 10100 10010 10001
S 01111 10000 10000 01110 00001 00001 11110
T 11111 00100 00100 00100 00100 00100 00100
U 10001 10001 10001 10001 10001 10001 01110
V 10001 10001 10001 10001 10001 01010 00100
W 10001 10001 10001 10101 10101 10101 01010
X 10001 10001 01010 00100 01010 10001 10001
Y 10001 10001 10001 01010 00100 00100 00100
Z 11111 00001 00010 00100 01000 10000 11111
0 01110 10001 10011 10101 11001 10001 01110
1 00100 01100 00100 00100 00100 00100 01110
2 01110 10001 00001 00010 00100 01000 11111
3 11111 00010 00100 00010 00001 10001 01110
4 00010 00110 01010 10010 11111 00010 00010
5 11111 10000 11110 00001 00001 10001 01110
6 00110 01000 10000 11110 10001 10001 01110
7 11111 00001 00010 00100 01000 01000 01000
8 01110 10001 10001 01110 10001 10001 01110
9 01110 10001 10001 01111 00001 00010 01100
+ 00000 00100 00100 11111 00100 00100 00000
- 00000 00000 00000 11111 00000 00000 00000
. 00000 00000 00000 00000 00000 01100 01100
, 00000 00000 00000 00000 01100 00100 01000
> 10000 01000 00100 00010 00100 01000 10000
/ 00000 00001 00010 00100 01000 10000 00000
: 00000 01100 01100 00000 01100 01100 00000
? 01110 10001 00001 00010 00100 00000 00100
! 00100 00100 00100 00100 00100 00000 00100
% 11000 11001 00010 00100 01000 10011 00011
# 11111 11111 11111 11111 11111 11111 11111
`;

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
- 000 000 111 000 000
+ 000 010 111 010 000
: 000 010 000 010 000
% 101 001 010 100 101
> 100 010 001 010 100
`;

export interface Face { w: number; h: number; glyphs: Map<string, boolean[][]> }

function parse(src: string, w: number, h: number): Face {
  const glyphs = new Map<string, boolean[][]>();
  for (const line of src.trim().split('\n')) {
    const [ch, ...rows] = line.trim().split(/\s+/);
    if (rows.length !== h || rows.some((r) => r.length !== w)) throw new Error(`Bad glyph ${ch}`);
    glyphs.set(ch, rows.map((r) => [...r].map((b) => b === '1')));
  }
  return { w, h, glyphs };
}

export const FACE_5X7 = parse(F5X7, 5, 7);
export const FACE_3X5 = parse(F3X5, 3, 5);

export type Role = 'hero' | 'h1' | 'body' | 'label';

export const ROLES: Record<Role, { face: Face; scale: number }> = {
  hero: { face: FACE_5X7, scale: 3 },
  h1: { face: FACE_5X7, scale: 2 },
  body: { face: FACE_5X7, scale: 1 },
  label: { face: FACE_3X5, scale: 1 },
};

/** Glyph bitmap, or null for blank (space and unknown characters). */
export function glyph(face: Face, ch: string): boolean[][] | null {
  return face.glyphs.get(ch.toUpperCase()) ?? null;
}

/** Cells advanced per character, including the 1-cell gap. */
export function advance(role: Role): number {
  const { face, scale } = ROLES[role];
  return (face.w + 1) * scale;
}

/** Text width in cells = (chars x (glyphWidth + 1) - 1) x scale. */
export function textWidth(text: string, role: Role): number {
  if (!text.length) return 0;
  const { face, scale } = ROLES[role];
  return (text.length * (face.w + 1) - 1) * scale;
}

export function textHeight(role: Role): number {
  const { face, scale } = ROLES[role];
  return face.h * scale;
}

/** The characters a 5x7 role can show. Used to sanitize AI replies. */
export const CHARSET_5X7 = new Set([...FACE_5X7.glyphs.keys(), ' ']);

/** Uppercase and replace unsupported characters with blanks. */
export function sanitize(text: string, role: Role = 'h1'): string {
  const face = ROLES[role].face;
  return [...text.toUpperCase()].map((c) => (c === ' ' || face.glyphs.has(c) ? c : ' ')).join('');
}

/** Greedy word wrap to a fixed number of characters per line. */
export function wrap(text: string, perLine: number, maxLines = Infinity): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (let word of words) {
    while (word.length > perLine) {
      if (cur) { lines.push(cur); cur = ''; }
      lines.push(word.slice(0, perLine));
      word = word.slice(perLine);
    }
    if (!cur) cur = word;
    else if (cur.length + 1 + word.length <= perLine) cur += ' ' + word;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}
