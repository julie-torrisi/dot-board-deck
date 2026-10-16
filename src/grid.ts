// The screen: a 384 x 216 grid of dots. Everything is drawn on whole cells.

export const COLS = 384;
export const ROWS = 216;
export const MARGIN = 19; // content spans col 19 to col 364
export const RIGHT = 365; // right-align edge (exclusive)

import { THEMES, TYPE, type Theme, type ThemeName, type Role } from './tokens';
import { capRows, nudge } from './type';
export { THEMES, type Theme, type ThemeName };

/** Ink levels. 0 means unlit. Signal is the one Cadence red per slide. */
export const enum Ink { Off = 0, Grey = 1, Ink = 2, Signal = 3 }

/** A character set in Doto or Inter, positioned in grid cells. scaleY drives the flip. */
export interface GlyphDraw { ch: string; x: number; row: number; role: Role; ink: Ink; scaleY: number }

/** Integer device pitch so dots stay crisp at any viewport. */
export function devicePitch(vw: number, vh: number, dpr: number): number {
  return Math.max(2, Math.floor(Math.min((vw * dpr) / COLS, (vh * dpr) / ROWS)));
}

export interface Geometry { pitch: number; dot: number; x0: number; y0: number; width: number; height: number }

export function geometry(vw: number, vh: number, dpr: number): Geometry {
  const pitch = devicePitch(vw, vh, dpr);
  const width = Math.round(vw * dpr);
  const height = Math.round(vh * dpr);
  return {
    pitch,
    dot: Math.max(1, Math.round(pitch * 0.8)),
    x0: Math.floor((width - COLS * pitch) / 2),
    y0: Math.floor((height - ROWS * pitch) / 2),
    width,
    height,
  };
}

/** One frame of the board: an ink level and a vertical flip scale per cell. */
export class Frame {
  ink = new Uint8Array(COLS * ROWS);
  scale = new Float32Array(COLS * ROWS).fill(1);
  clear() { this.ink.fill(0); this.scale.fill(1); }
  set(col: number, row: number, ink: Ink, scale = 1) {
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return;
    const i = row * COLS + col;
    this.ink[i] = ink;
    this.scale[i] = scale;
  }
}

export interface ImageLayer { img: CanvasImageSource; col: number; row: number; cols: number; rows: number; alpha: number }

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private screen: HTMLCanvasElement = document.createElement('canvas');
  geo!: Geometry;
  theme: Theme = THEMES.dark;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
  }

  resize(vw = window.innerWidth, vh = window.innerHeight, dpr = window.devicePixelRatio || 1) {
    this.geo = geometry(vw, vh, dpr);
    this.canvas.width = this.geo.width;
    this.canvas.height = this.geo.height;
    this.paintScreen();
  }

  setTheme(name: ThemeName) {
    this.theme = THEMES[name];
    if (this.geo) this.paintScreen();
  }

  /** Paint the unlit screen once to an offscreen canvas. */
  private paintScreen() {
    const { width, height, pitch, dot, x0, y0 } = this.geo;
    this.screen.width = width;
    this.screen.height = height;
    const c = this.screen.getContext('2d')!;
    c.fillStyle = this.theme.bg;
    c.fillRect(0, 0, width, height);
    c.fillStyle = this.theme.unlit;
    c.beginPath();
    const r = dot / 2;
    for (let row = 0; row < ROWS; row++) {
      const cy = y0 + row * pitch + r;
      for (let col = 0; col < COLS; col++) {
        const cx = x0 + col * pitch + r;
        c.moveTo(cx + r, cy);
        c.arc(cx, cy, r, 0, Math.PI * 2);
      }
    }
    c.fill();
  }

  /** Cell rectangle in device pixels, for image layers. */
  cellRect(col: number, row: number, cols: number, rows: number) {
    const { pitch, x0, y0 } = this.geo;
    return { x: x0 + col * pitch, y: y0 + row * pitch, w: cols * pitch - (pitch - this.geo.dot), h: rows * pitch - (pitch - this.geo.dot) };
  }

  private inkColor(level: Ink): string {
    return level === Ink.Grey ? this.theme.grey : level === Ink.Signal ? this.theme.signal : this.theme.ink;
  }

  draw(frame: Frame, images: ImageLayer[] = [], glyphs: GlyphDraw[] = []) {
    const { ctx } = this;
    const { pitch, dot, x0, y0 } = this.geo;
    ctx.drawImage(this.screen, 0, 0);
    const r = dot / 2;
    for (let level = 1; level <= 3; level++) {
      ctx.fillStyle = this.inkColor(level as Ink);
      ctx.beginPath();
      for (let i = 0; i < frame.ink.length; i++) {
        if (frame.ink[i] !== level) continue;
        const s = frame.scale[i];
        if (s <= 0.02) continue;
        const col = i % COLS;
        const row = (i - col) / COLS;
        const cx = x0 + col * pitch + r;
        const cy = y0 + row * pitch + r;
        if (s >= 0.999) {
          ctx.moveTo(cx + r, cy);
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
        } else {
          ctx.moveTo(cx + r, cy);
          ctx.ellipse(cx, cy, r, r * s, 0, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    }
    for (const im of images) {
      if (im.alpha <= 0) continue;
      const rect = this.cellRect(im.col, im.row, im.cols, im.rows);
      ctx.globalAlpha = im.alpha;
      drawCover(ctx, im.img, rect.x, rect.y, rect.w, rect.h);
      ctx.globalAlpha = 1;
    }
    // type: Doto for display, Inter for everything else
    ctx.textBaseline = 'alphabetic';
    let font = '';
    for (const g of glyphs) {
      if (g.scaleY <= 0.02 || g.ch === ' ') continue;
      const t = TYPE[g.role];
      const f = `${t.weight} ${t.size * pitch}px ${t.family}, ${t.family === 'Doto' ? 'monospace' : 'system-ui, sans-serif'}`;
      if (f !== font) { ctx.font = f; font = f; }
      ctx.fillStyle = this.inkColor(g.ink);
      const x = x0 + (g.x + nudge(g.ch, g.role)) * pitch;
      const cap = capRows(g.role) * pitch;
      const base = y0 + g.row * pitch + cap;
      if (g.scaleY >= 0.999) { ctx.fillText(g.ch, x, base); continue; }
      const mid = base - cap / 2;
      ctx.save();
      ctx.translate(0, mid);
      ctx.scale(1, g.scaleY);
      ctx.fillText(g.ch, x, base - mid);
      ctx.restore();
    }
  }
}

function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource, x: number, y: number, w: number, h: number) {
  const iw = (img as HTMLImageElement).naturalWidth || (img as HTMLCanvasElement).width;
  const ih = (img as HTMLImageElement).naturalHeight || (img as HTMLCanvasElement).height;
  if (!iw || !ih) return;
  // contain, centered, so screens are never cropped
  const s = Math.min(w / iw, h / ih);
  const dw = iw * s, dh = ih * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
