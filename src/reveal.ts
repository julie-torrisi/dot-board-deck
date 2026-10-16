// Screens dissolve in from dots, then resolve to the real image inside a grid-aligned frame.

import { Frame, Ink, type ImageLayer } from './grid';
import type { ImageItem } from './deck';

export const REVEAL_MS = 520;
const cache = new Map<string, HTMLImageElement>();

export function load(src: string): HTMLImageElement {
  let img = cache.get(src);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = src;
    cache.set(src, img);
  }
  return img;
}

/** Stable pseudo-random threshold per cell, so the dissolve doesn't shimmer. */
function hash(col: number, row: number): number {
  let h = (col * 374761393 + row * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Draws the dot dissolve into the frame and returns image layers at the right alpha. */
export function revealImages(frame: Frame, items: ImageItem[], start: number, t: number, reduced: boolean): { layers: ImageLayer[]; moving: boolean } {
  const layers: ImageLayer[] = [];
  let moving = false;
  const p = reduced ? 1 : Math.min(1, Math.max(0, (t - start) / REVEAL_MS));
  for (const it of items) {
    const img = load(it.src);
    const ready = img.complete && img.naturalWidth > 0;
    const broken = img.complete && img.naturalWidth === 0;
    if (!ready && !broken) moving = true;
    // phase 1: dots light up in a dissolve; phase 2: dots give way to the image
    const dotsOn = p < 0.5 ? p * 2 : 1 - (p - 0.5) * 2;
    if (dotsOn > 0 && p < 1) {
      for (let r = 0; r < it.rows; r++) for (let c = 0; c < it.cols; c++) {
        if (hash(it.col + c, it.row + r) < dotsOn) frame.set(it.col + c, it.row + r, Ink.Grey);
      }
    }
    if (ready && p > 0.5) layers.push({ img, col: it.col, row: it.row, cols: it.cols, rows: it.rows, alpha: Math.min(1, (p - 0.5) * 2) });
  }
  if (p < 1 && items.length) moving = true;
  return { layers, moving };
}
