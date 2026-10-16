// Turns a slide spec into absolute, grid-aligned items, including the chrome.

import { COLS, MARGIN, RIGHT } from './grid';
import { textWidth, advance, wrap, type Role } from './glyphs';
import type { Deck, Item, SlideSpec, TextItem } from './deck';

export const CONTENT_W = RIGHT - MARGIN; // 346 cells
export const CENTER = 192;
export const PROGRESS_ROW = 192;
export const ASK = { col: 34, row: 70, perLine: 23, lines: 3, step: 24 };

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Resolve alignment to a left column. */
export function startCol(item: TextItem): number {
  const w = textWidth(item.text, item.role);
  if (item.align === 'right') return item.col - w;
  if (item.align === 'center') return item.col - Math.floor(w / 2);
  return item.col;
}

/** Max characters that fit from a column to the right margin. */
export function fits(role: Role, fromCol = MARGIN): number {
  return Math.floor((RIGHT - fromCol + 1) / advance(role));
}

const text = (role: Role, col: number, row: number, s: string, ink: 'ink' | 'grey' = 'ink', extra: Partial<TextItem> = {}): TextItem =>
  ({ t: 'text', role, col, row, text: s, ink, ...extra });

export function chrome(deck: Deck, slide: SlideSpec, index: number, total: number): Item[] {
  const pct = Math.round((100 * (index + 1)) / total);
  return [
    { t: 'block', col: 19, row: 20, w: 3, h: 3, ink: 'ink' },
    text('label', 26, 19, deck.brand),
    text('label', CENTER, 19, slide.label, 'grey', { align: 'center' }),
    text('label', RIGHT, 19, `PG ${pad2(index + 1)}/${pad2(total)}`, 'grey', { align: 'right' }),
    text('label', 19, 197, deck.footer, 'grey'),
    text('label', RIGHT, 197, `${pct}% READ`, 'grey', { align: 'right' }),
  ];
}

export function progressLength(index: number, total: number): number {
  return Math.round((CONTENT_W * (index + 1)) / total);
}

export function body(slide: SlideSpec): Item[] {
  const s = slide as SlideSpec;
  switch (s.template) {
    case 'boot': {
      const out: Item[] = [text('label', 19, 70, s.kicker)];
      s.lines.forEach((l, i) => out.push(text('h1', 19, 82 + i * 24, l)));
      const last = s.lines[s.lines.length - 1] ?? '';
      const lastRow = 82 + (s.lines.length - 1) * 24;
      out.push(text('h1', 19 + (last.length + 1) * advance('h1') - advance('h1'), lastRow, '#', 'ink', { cursor: true }));
      if (s.sub) out.push(text('body', 19, lastRow + 28, s.sub, 'grey'));
      return out;
    }
    case 'section': {
      const out: Item[] = [
        text('hero', 19, 82, s.num),
        text('label', 77, 74, s.kicker, 'grey'),
        text('h1', 77, 86, s.title),
      ];
      (s.lines ?? []).forEach((l, i) => out.push(text('body', 77, 115 + i * 13, l, 'grey')));
      return out;
    }
    case 'statement': {
      const out: Item[] = [];
      let row = 82;
      const col = s.prompt ? 34 : 19;
      if (s.kicker) out.push(text('label', 19, 70, s.kicker, 'grey'));
      if (s.prompt) out.push(text('h1', 19, 82, '>', 'grey'));
      s.lines.forEach((l, i) => out.push(text('h1', col, 82 + i * 24, l)));
      row = 82 + s.lines.length * 24 + 4;
      (s.body ?? []).forEach((l, i) => out.push(text('body', col, row + i * 13, l, 'grey')));
      if (s.note) out.push(text('label', col, row + (s.body?.length ?? 0) * 13 + 6, s.note, 'grey'));
      return out;
    }
    case 'readout': {
      const cols = [19, 134, 250];
      const out: Item[] = [];
      s.stats.slice(0, 3).forEach((st, i) => {
        out.push(text('label', cols[i], 70, pad2(i + 1), i === 0 ? 'ink' : 'grey'));
        out.push(text('hero', cols[i], 82, st.value));
        out.push(text('label', cols[i], 115, st.label, 'grey'));
      });
      if (s.source) out.push(text('label', 19, 149, s.source, 'grey'));
      return out;
    }
    case 'departures': {
      const [h1, h2, h3] = s.heads ?? ['CODE', 'PROJECT', 'STATUS'];
      const out: Item[] = [
        text('label', 19, 62, h1, 'grey'),
        text('label', 72, 62, h2, 'grey'),
        text('label', RIGHT, 62, h3, 'grey', { align: 'right' }),
      ];
      s.rows.slice(0, 4).forEach((r, i) => {
        const row = 74 + i * 26;
        out.push(text('h1', 19, row, r.code, 'grey'));
        out.push(text('h1', 72, row, r.project, 'ink'));
        out.push(text('h1', RIGHT, row, r.status, r.live ? 'ink' : 'grey', { align: 'right' }));
      });
      return out;
    }
    case 'image': {
      const out: Item[] = [];
      if (s.kicker) out.push(text('label', 19, 34, s.kicker, 'grey'));
      out.push(text('h1', 19, 42, s.title));
      out.push({ t: 'image', src: s.image.src, alt: s.image.alt, col: 19, row: 62, cols: CONTENT_W, rows: s.caption ? 116 : 124 });
      if (s.caption) out.push(text('label', 19, 182, s.caption, 'grey'));
      return out;
    }
    case 'wall': {
      const out: Item[] = [];
      if (s.kicker) out.push(text('label', 19, 34, s.kicker, 'grey'));
      out.push(text('h1', 19, 42, s.title));
      out.push(...wallCells(s.images, 62, s.caption ? 116 : 124));
      if (s.caption) out.push(text('label', 19, 182, s.caption, 'grey'));
      return out;
    }
    case 'eof': {
      const out: Item[] = [text('h1', 19, 82, s.title)];
      out.push(text('h1', 19 + s.title.length * advance('h1') + advance('h1') - advance('h1'), 82, '#', 'ink', { cursor: true }));
      s.lines.forEach((l, i) => out.push(text('body', 19, 115 + i * 13, l, i === 0 ? 'ink' : 'grey')));
      return out;
    }
    case 'ask': {
      return [
        text('label', 19, 46, s.title ?? 'ASK THE BOARD', 'grey'),
        text('h1', 19, ASK.row, '>', 'grey'),
        { t: 'ask' },
      ];
    }
    default:
      return [];
  }
}

/** Lay out a grid of screens inside the content area, aligned to whole cells. */
export function wallCells(images: { src: string; alt: string }[], top: number, height: number): Item[] {
  const n = images.length;
  if (!n) return [];
  const perRow = n <= 3 ? n : n <= 8 ? Math.ceil(n / 2) : Math.ceil(n / 3);
  const rowsN = Math.ceil(n / perRow);
  const gap = 3;
  const w = Math.floor((CONTENT_W - gap * (perRow - 1)) / perRow);
  const h = Math.floor((height - gap * (rowsN - 1)) / rowsN);
  return images.map((im, i) => ({
    t: 'image' as const, src: im.src, alt: im.alt,
    col: MARGIN + (i % perRow) * (w + gap),
    row: top + Math.floor(i / perRow) * (h + gap),
    cols: w, rows: h,
  }));
}

export function layoutSlide(deck: Deck, index: number): Item[] {
  const slide = deck.slides[index];
  return [...chrome(deck, slide, index, deck.slides.length), ...body(slide), ...(slide.items ?? [])];
}

/** Warnings for text that runs past the right margin or off the grid. */
export function overflow(deck: Deck): string[] {
  const warnings: string[] = [];
  deck.slides.forEach((_, i) => {
    for (const it of layoutSlide(deck, i)) {
      if (it.t !== 'text') continue;
      const c = startCol(it);
      const end = c + textWidth(it.text, it.role);
      if (c < 0 || end > COLS || (end > RIGHT && it.align !== 'right')) {
        warnings.push(`Slide ${i + 1} (${deck.slides[i].id}): "${it.text}" runs past the margin`);
      }
    }
  });
  return warnings;
}

export { wrap };
