// Turns a slide spec into absolute, grid-aligned items, including the chrome.
// Every template flows text with real wrapping, so the deck check can catch overflow before a talk.

import { COLS, MARGIN, RIGHT } from './grid';
import { wrap } from './glyphs';
import { textWidth, advance, perLine, capRows, lead } from './type';
import type { Role } from './tokens';
import type { Deck, Item, SlideSpec, TextItem, InkName, Quote, Pic } from './deck';

export const MARGIN_L = MARGIN;          // 19
export const CONTENT_W = RIGHT - MARGIN; // 346 cells
export const CENTER = 192;
export const EYEBROW_ROW = 12;
export const TOP = 26;                   // first content row under the eyebrow
export const BOTTOM = 196;               // content must end above this row
export const FOOTER_ROW = 203;
export const PROGRESS = { row: 212 };
export const QUOTE_MS = 7000;

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Resolve alignment to a left column. */
export function startCol(item: TextItem): number {
  const w = item.cursor ? 5 * (item.role === 'hero' ? 3 : item.role === 'h1' ? 2 : 1) : textWidth(item.text, item.role);
  if (item.align === 'right') return item.col - w;
  if (item.align === 'center') return item.col - Math.floor(w / 2);
  return item.col;
}

/** Max characters that fit from a column to the right margin. */
export function fits(role: Role, fromCol = MARGIN): number {
  return perLine(role, RIGHT - fromCol);
}

const text = (role: Role, col: number, row: number, s: string, ink: InkName = 'ink', extra: Partial<TextItem> = {}): TextItem =>
  ({ t: 'text', role, col, row, text: s, ink, ...extra });

/** Bottom row of a line of text, including descenders for Doto roles. */
export function lineBottom(role: Role, row: number): number {
  return row + capRows(role) + (role === 'label' ? 0 : Math.round(capRows(role) * 2 / 7));
}

/** Stacks wrapped paragraphs inside a column. */
export class Flow {
  items: Item[] = [];
  constructor(public col: number, public width: number, public row: number) {}
  para(role: Role, s: string | undefined, ink: InkName = 'ink', gapAfter = 0, align: 'left' | 'center' = 'left'): number {
    if (!s) return this.row;
    const x = align === 'center' ? this.col + Math.floor(this.width / 2) : this.col;
    for (const l of wrap(s, perLine(role, this.width))) {
      this.items.push(text(role, x, this.row, l, ink, align === 'center' ? { align: 'center' } : {}));
      this.row += lead(role);
    }
    this.row += gapAfter;
    return this.row;
  }
  gap(n: number) { this.row += n; return this; }
}

export function chrome(deck: Deck, slide: SlideSpec, index: number, _total: number): Item[] {
  const out: Item[] = [];
  if (slide.label) out.push(text('label', MARGIN, EYEBROW_ROW, slide.label, 'grey'));
  out.push(text('label', MARGIN, FOOTER_ROW, deck.footer, 'grey'));
  const right = deck.site ? `${deck.site} · ${pad2(index + 1)}` : pad2(index + 1);
  out.push(text('label', RIGHT, FOOTER_ROW, right, 'grey', { align: 'right' }));
  return out;
}

export function progressLength(index: number, total: number): number {
  return Math.round((CONTENT_W * (index + 1)) / total);
}

/** The bottom band: the red "why" line (one label line) and the see-it links above it. */
export function extras(slide: SlideSpec): { items: Item[]; top: number } {
  const items: Item[] = [];
  let row = BOTTOM - 5;
  if (slide.why) {
    for (const l of wrap(slide.why, perLine('label', CONTENT_W)).reverse()) { items.push(text('label', MARGIN, row, l, 'signal')); row -= 8; }
    row -= 4;
  }
  if (slide.see?.length || slide.sources) {
    let col = MARGIN;
    if (slide.see?.length) {
      items.push(text('label', col, row, 'SEE IT:', 'grey'));
      col += textWidth('SEE IT: ', 'label') + 4;
      for (const s of slide.see) {
        const w = textWidth(s.label, 'label');
        items.push(text('label', col, row, s.label, 'ink'));
        items.push({ t: 'rule', col, row: row + 7, w, ink: 'grey' });
        items.push({ t: 'link', href: s.href, label: s.label, col: col - 1, row: row - 2, cols: w + 2, rows: 11, copy: s.copy });
        col += w + 16;
      }
    }
    if (slide.sources) {
      const lines = wrap(slide.sources, perLine('label', RIGHT - col));
      lines.reverse().forEach((l, i) => items.push(text('label', col, row - i * 8, l, 'grey')));
      row -= (lines.length - 1) * 8;
    }
    row -= 4;
  }
  return { items, top: row + 2 };
}

/** Stack of short captioned photos in a grid, cropped to fill. */
function photoGrid(photos: Pic[], col: number, top: number, width: number, height: number, cols: number): Item[] {
  const out: Item[] = [];
  const rowsN = Math.ceil(photos.length / cols);
  const gap = 3;
  const cap = photos.some((p) => p.caption) ? 8 : 0;
  const w = Math.floor((width - gap * (cols - 1)) / cols);
  const h = Math.floor((height - gap * (rowsN - 1) - cap * rowsN) / rowsN);
  photos.forEach((p, i) => {
    const c = col + (i % cols) * (w + gap);
    const r = top + Math.floor(i / cols) * (h + cap + gap);
    out.push({ t: 'image', src: p.src, alt: p.alt, col: c, row: r, cols: w, rows: h, fit: 'cover' });
    if (p.caption) out.push(text('label', c, r + h + 2, wrap(p.caption, perLine('label', w))[0], 'grey'));
  });
  return out;
}

/** Testimonial carousel: the quote, who said it, and position dots. */
export function quoteItems(quotes: Quote[], i: number, top = 98): Item[] {
  if (!quotes.length) return [];
  const q = quotes[((i % quotes.length) + quotes.length) % quotes.length];
  const f = new Flow(MARGIN + 23, CONTENT_W - 46, top);
  f.para('body', q.quote, 'ink', 4, 'center');
  f.para('label', q.by, 'grey', 0, 'center');
  const items = f.items;
  const n = quotes.length;
  const x0 = CENTER - Math.floor((n * 6 - 2) / 2);
  quotes.forEach((_, k) => items.push({ t: 'block', col: x0 + k * 6, row: 186, w: k === i % n ? 4 : 2, h: 1, ink: k === i % n ? 'ink' : 'dim' }));
  return items;
}

export function body(slide: SlideSpec): Item[] {
  const s = slide as SlideSpec;
  switch (s.template) {
    case 'boot': {
      const role: Role = s.hero ? 'hero' : 'h1';
      const step = lead(role) + (s.hero ? 2 : 4);
      const first = s.hero ? 74 : 82;
      const out: Item[] = [text('label', MARGIN, first - 12, s.kicker, 'grey')];
      s.lines.forEach((l, i) => out.push(text(role, MARGIN, first + i * step, l)));
      const last = s.lines[s.lines.length - 1] ?? '';
      const lastRow = first + (s.lines.length - 1) * step;
      out.push(text(role, MARGIN + (last.length + 1) * advance(role), lastRow, '#', 'ink', { cursor: true }));
      if (s.sub) out.push(text('body', MARGIN, lastRow + capRows(role) + 14, s.sub, 'grey'));
      return out;
    }
    case 'intro': {
      const leftW = 240;
      const imgCol = MARGIN + leftW + 10;
      const imgW = RIGHT - imgCol;
      const imgH = Math.round(imgW * 0.48);
      const out: Item[] = [
        { t: 'image', src: s.image.src, alt: s.image.alt, col: imgCol, row: TOP + 8, cols: imgW, rows: imgH, fit: 'cover' },
      ];
      const f = new Flow(MARGIN, leftW, TOP);
      f.para('label', s.to, 'grey', 4);
      f.para('h1', s.headline, 'ink', 2);
      f.row = Math.max(f.row, TOP + 8 + imgH + 6);
      f.width = CONTENT_W;
      f.para('body', s.signal, 'signal', 4);
      f.para('body', s.body, 'grey', 4);
      f.para('label', s.tldr, 'ink');
      return [...out, ...f.items];
    }
    case 'about': {
      const leftW = 166;
      const f = new Flow(MARGIN, leftW, TOP);
      s.paragraphs.forEach((p, i) => f.para('body', p, i === 0 ? 'ink' : 'grey', 5));
      const col = MARGIN + leftW + 12;
      return [...f.items, ...photoGrid(s.photos, col, TOP, RIGHT - col, BOTTOM - TOP, 3)];
    }
    case 'cards': {
      const f = new Flow(MARGIN, CONTENT_W, TOP);
      f.para('h1', s.title, 'ink', 2);
      f.para('body', s.lead, 'grey', 6);
      const out = [...f.items];
      if (s.layout === 'rows') {
        // one row per point: icon, the title in ink, the detail underneath in grey
        let row = f.row + 2;
        const tx = MARGIN + 22;
        for (const c of s.cards) {
          out.push({ t: 'rule', col: MARGIN, row, w: CONTENT_W, ink: 'dim' });
          row += 4;
          if (c.icon) out.push({ t: 'icon', name: c.icon, col: MARGIN, row, ink: 'ink' });
          const tf = new Flow(tx, RIGHT - tx, row);
          tf.para('body', c.title, 'ink');
          tf.para('body', c.body, 'grey');
          out.push(...tf.items);
          row = Math.max(row + 16, tf.row) + 1;
        }
        return out;
      }
      const n = s.cards.length;
      const gap = 14;
      const w = Math.floor((CONTENT_W - gap * (n - 1)) / n);
      s.cards.forEach((c, i) => {
        const col = MARGIN + i * (w + gap);
        const cf = new Flow(col, w, f.row + 5);
        out.push({ t: 'rule', col, row: f.row, w, ink: 'dim' });
        const inline = !!c.icon && w >= 90;
        if (c.icon) out.push({ t: 'icon', name: c.icon, col, row: cf.row, ink: 'ink' });
        if (inline) {
          const tf = new Flow(col + 21, w - 21, cf.row + 4);
          tf.para('body', c.title, 'ink');
          out.push(...tf.items);
          cf.row = Math.max(cf.row + 20, tf.row + 3);
        } else {
          if (c.icon) cf.gap(20);
          cf.para('body', c.title, 'ink', 3);
        }
        cf.para('body', c.body, 'grey');
        out.push(...cf.items);
      });
      return out;
    }
    case 'press': {
      const f = new Flow(MARGIN, CONTENT_W, TOP);
      f.para('h1', s.title, 'ink', 2);
      f.para('body', s.lead, 'grey', 6);
      const out = [...f.items];
      const leftW = 180;
      const lf = new Flow(MARGIN, leftW, f.row);
      lf.para('label', 'MY ROLE', 'grey', 3);
      lf.para('body', s.role, 'ink', 6);
      if (s.stats?.length) {
        const sw = Math.floor(leftW / s.stats.length);
        s.stats.forEach((st, i) => {
          lf.items.push(text('h1', MARGIN + i * sw, lf.row, st.value, 'ink'));
          wrap(st.label, perLine('label', sw - 6)).slice(0, 2).forEach((l, k) => lf.items.push(text('label', MARGIN + i * sw, lf.row + 18 + k * 7, l, 'grey')));
        });
        lf.row += 32;
      }
      out.push(...lf.items);
      // press cards: thumbnail, outlet and date, headline. The whole card is a link.
      const col = MARGIN + leftW + 12;
      const pw = RIGHT - col;
      let row = f.row;
      out.push(text('label', col, row, 'PRESS', 'grey'));
      row += 11;
      for (const p of s.press) {
        const tw = 40, th = 23;
        if (p.thumb) out.push({ t: 'image', src: p.thumb, alt: `${p.outlet}: ${p.title}`, col, row, cols: tw, rows: th, fit: 'cover' });
        else out.push({ t: 'icon', name: 'external', col: col + 12, row: row + 4, ink: 'grey' });
        if (!p.thumb) out.push({ t: 'rule', col, row, w: tw, ink: 'dim' }, { t: 'rule', col, row: row + th - 1, w: tw, ink: 'dim' });
        const tx = col + tw + 6;
        const tf = new Flow(tx, RIGHT - tx, row);
        tf.para('label', `${p.outlet} · ${p.date}`, 'grey', 2);
        tf.para('label', p.title, 'ink', 0);
        out.push(...tf.items);
        out.push({ t: 'link', href: p.href, label: `${p.outlet}: ${p.title}`, col: col - 1, row: row - 1, cols: pw + 2, rows: Math.max(th, tf.row - row) + 2 });
        row = Math.max(row + th, tf.row) + 6;
      }
      return out;
    }
    case 'list': {
      const f = new Flow(MARGIN, CONTENT_W, TOP);
      f.para('h1', s.title, 'ink', 2);
      f.para('body', s.lead, 'grey', 6);
      const n = s.columns.length;
      const gap = 14;
      const w = Math.floor((CONTENT_W - gap * (n - 1)) / n);
      const out = [...f.items];
      s.columns.forEach((c, i) => {
        const cf = new Flow(MARGIN + i * (w + gap), w, f.row);
        cf.para('label', c.head, 'grey', 4);
        for (const it of c.items) cf.para('body', it, 'ink', 1);
        out.push(...cf.items);
      });
      return out;
    }
    case 'thanks': {
      const out: Item[] = [text('h1', CENTER, 46, s.title, 'ink', { align: 'center' })];
      // contacts on one centered line; each one with an href is underlined and clickable
      const parts = s.contacts.map((c) => (typeof c === 'string' ? { label: c, href: '' } : c));
      const SEP = 20; // two spaces, a dot, two spaces in the 4-cell label face
      const widths = parts.map((p) => textWidth(p.label, 'label'));
      const total = widths.reduce((a, w) => a + w + 1, 0) - 1 + SEP * (parts.length - 1);
      let col = CENTER - Math.floor(total / 2);
      parts.forEach((p, i) => {
        const w = widths[i];
        out.push(text('label', col, 70, p.label, p.href ? 'ink' : 'grey'));
        if (p.href) {
          out.push({ t: 'rule', col, row: 77, w, ink: 'grey' });
          out.push({ t: 'link', href: p.href, label: p.label, col: col - 1, row: 68, cols: w + 2, rows: 11 });
        }
        if (i < parts.length - 1) out.push(text('label', col + w + 1 + 8, 70, '·', 'grey'));
        col += w + 1 + SEP;
      });
      return out;
    }
    case 'section': {
      const out: Item[] = [
        text('hero', MARGIN, 82, s.num),
        text('label', 77, 74, s.kicker, 'grey'),
        text('h1', 77, 86, s.title),
      ];
      (s.lines ?? []).forEach((l, i) => out.push(text('body', 77, 112 + i * lead('body'), l, 'grey')));
      return out;
    }
    case 'statement': {
      const out: Item[] = [];
      const col = s.prompt ? 34 : MARGIN;
      if (s.kicker) out.push(text('label', MARGIN, 70, s.kicker, 'grey'));
      if (s.prompt) out.push(text('h1', MARGIN, 82, '>', 'grey'));
      s.lines.forEach((l, i) => out.push(text('h1', col, 82 + i * 22, l)));
      let row = 82 + s.lines.length * 22 + 4;
      for (const l of joinBroken(s.body ?? [])) for (const w of wrap(l, perLine('body', RIGHT - col))) { out.push(text('body', col, row, w, 'grey')); row += lead('body'); }
      if (s.note) out.push(text('label', col, row + 4, s.note, 'grey'));
      return out;
    }
    case 'readout': {
      const f = new Flow(MARGIN, CONTENT_W, TOP);
      f.para('h1', s.title, 'ink', 2);
      f.para('body', s.lead, 'grey', 8);
      const top = s.title ? f.row : 70;
      const cols = [MARGIN, 134, 250];
      const out: Item[] = [...f.items];
      s.stats.slice(0, 3).forEach((st, i) => {
        out.push(text('label', cols[i], top, pad2(i + 1), 'grey'));
        out.push(text('hero', cols[i], top + 10, st.value));
        wrap(st.label, perLine('label', 105)).slice(0, 2).forEach((l, k) => out.push(text('label', cols[i], top + 40 + k * 8, l, 'grey')));
      });
      if (s.source) out.push(text('label', MARGIN, top + 62, s.source, 'grey'));
      return out;
    }
    case 'departures': {
      const [h1, h2, h3] = s.heads ?? ['CODE', 'PROJECT', 'STATUS'];
      const out: Item[] = [
        text('label', MARGIN, 62, h1, 'grey'),
        text('label', 72, 62, h2, 'grey'),
        text('label', RIGHT, 62, h3, 'grey', { align: 'right' }),
      ];
      s.rows.slice(0, 4).forEach((r, i) => {
        const row = 74 + i * 26;
        out.push(text('h1', MARGIN, row, r.code, 'grey'));
        out.push(text('h1', 72, row, r.project, 'ink'));
        out.push(text('h1', RIGHT, row, r.status, r.live ? 'ink' : 'grey', { align: 'right' }));
      });
      return out;
    }
    case 'image': {
      const f = new Flow(MARGIN, CONTENT_W, TOP);
      if (s.kicker) f.para('label', s.kicker, 'grey', 3);
      f.para('h1', s.title, 'ink', 2);
      f.para('body', s.lead, 'grey', 4);
      const { top } = extras(s);
      const bottom = Math.min(top, s.caption ? BOTTOM - 10 : BOTTOM);
      const out: Item[] = [...f.items, { t: 'image', src: s.image.src, alt: s.image.alt, col: MARGIN, row: f.row, cols: CONTENT_W, rows: bottom - f.row }];
      if (s.caption) out.push(text('label', MARGIN, bottom + 4, s.caption, 'grey'));
      return out;
    }
    case 'wall': {
      const f = new Flow(MARGIN, CONTENT_W, TOP);
      if (s.kicker) f.para('label', s.kicker, 'grey', 3);
      f.para('h1', s.title, 'ink', 2);
      f.para('body', s.lead, 'grey', 4);
      const { top } = extras(s);
      const bottom = Math.min(top, s.caption ? BOTTOM - 10 : BOTTOM);
      if (s.gallery && s.images.length) {
        // one screen at a time, with position dots; click it to browse them all
        const h = bottom - f.row - 12;
        const out: Item[] = [...f.items, { t: 'image', src: s.images[0].src, alt: s.images[0].alt, col: MARGIN, row: f.row, cols: CONTENT_W, rows: h }];
        const n = s.images.length;
        const r = f.row + h + 5;
        s.images.forEach((_, k) => out.push({ t: 'block', col: MARGIN + k * 6, row: r + 2, w: k === 0 ? 4 : 2, h: 1, ink: k === 0 ? 'ink' : 'dim' }));
        out.push(text('label', MARGIN + n * 6 + 6, r, `1 OF ${n} · CLICK THE SCREEN TO SEE ALL ${n}`, 'grey'));
        return out;
      }
      const out: Item[] = [...f.items, ...wallCells(s.images, f.row, bottom - f.row, s.columns)];
      if (s.caption) out.push(text('label', MARGIN, bottom + 4, s.caption, 'grey'));
      return out;
    }
    case 'eof': {
      const out: Item[] = [text('h1', MARGIN, 82, s.title)];
      out.push(text('h1', MARGIN + (s.title.length + 1) * advance('h1'), 82, '#', 'ink', { cursor: true }));
      s.lines.forEach((l, i) => out.push(text('body', MARGIN, 110 + i * lead('body'), l, i === 0 ? 'ink' : 'grey')));
      return out;
    }
    default:
      return [];
  }
}

/** Older decks broke sentences across entries by hand; rejoin any entry that doesn't end a sentence. */
export function joinBroken(lines: string[]): string[] {
  const out: string[] = [];
  for (const l of lines) {
    const prev = out[out.length - 1];
    if (prev !== undefined && !/[.?!:]$/.test(prev)) out[out.length - 1] = `${prev} ${l}`;
    else out.push(l);
  }
  return out;
}

/** Lay out a grid of screens inside the content area, aligned to whole cells. */
export function wallCells(images: { src: string; alt: string }[], top: number, height: number, columns?: number): Item[] {
  const n = images.length;
  if (!n) return [];
  const perRow = columns ? Math.max(1, Math.min(columns, n)) : n <= 3 ? n : n <= 8 ? Math.ceil(n / 2) : Math.ceil(n / 3);
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

export function layoutSlide(deck: Deck, index: number, quote = 0): Item[] {
  const slide = deck.slides[index];
  const ex = slide.template === 'image' || slide.template === 'wall' || slide.why || slide.see || slide.sources ? extras(slide).items : [];
  const q = slide.template === 'thanks' ? quoteItems(slide.quotes, quote) : [];
  return [...chrome(deck, slide, index, deck.slides.length), ...body(slide), ...ex, ...q, ...(slide.items ?? [])];
}

/** Warnings for text that runs past the margins, off the grid, or into the bottom band. */
export function overflow(deck: Deck): string[] {
  const warnings: string[] = [];
  deck.slides.forEach((slide, i) => {
    const at = `Slide ${i + 1} (${slide.id})`;
    const band = slide.why || slide.see || slide.sources ? extras(slide).top : BOTTOM;
    for (const it of body(slide)) {
      if (it.t === 'text') {
        const c = startCol(it);
        const end = c + textWidth(it.text, it.role);
        if (c < 0 || end > COLS || (end > RIGHT && it.align !== 'right')) warnings.push(`${at}: "${it.text}" runs past the margin`);
        if (lineBottom(it.role, it.row) > band) warnings.push(`${at}: "${it.text}" runs into the bottom of the slide`);
      }
      if (it.t === 'image' && (it.rows < 8 || it.row + it.rows > band + 1)) warnings.push(`${at}: image "${it.alt}" has no room`);
    }
    for (const it of extras(slide).items) {
      if (it.t === 'text' && (startCol(it) + textWidth(it.text, it.role) > RIGHT)) warnings.push(`${at}: "${it.text}" runs past the margin`);
    }
    if (slide.template === 'thanks') for (let k = 0; k < slide.quotes.length; k++) {
      for (const it of quoteItems(slide.quotes, k)) if (it.t === 'text' && lineBottom(it.role, it.row) > 182) warnings.push(`${at}: quote ${k + 1} is too long`);
    }
  });
  return warnings;
}

export { wrap };
