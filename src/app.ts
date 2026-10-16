// The deck controller: navigation, themes, presenter sync and the draw loop.

import { Renderer, Frame, type ThemeName } from './grid';
import { layoutSlide, progressLength } from './layout';
import { slotsOf, blocksOf, imagesOf } from './board';
import { FlapEngine } from './flap';
import { revealImages, load } from './reveal';
import type { Deck, Item } from './deck';

export interface SlideHooks { onEnter?(index: number, items: Item[]): void; overlay?(frame: Frame, t: number): boolean }

export class DeckApp {
  readonly renderer: Renderer;
  readonly engine = new FlapEngine();
  private frame = new Frame();
  private items: Item[] = [];
  /** Live items added to the current slide, such as an icebreaker reply. */
  private extra: Item[] = [];
  private imageStart = 0;
  private raf = 0;
  index = -1;
  hooks: SlideHooks = {};
  private channel?: BroadcastChannel;

  constructor(canvas: HTMLCanvasElement, readonly deck: Deck) {
    this.renderer = new Renderer(canvas);
    this.engine.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    try { this.channel = new BroadcastChannel('dot-board'); } catch { /* not supported */ }
    this.channel?.addEventListener('message', (e) => {
      if (e.data?.type === 'goto' && e.data.index !== this.index) this.go(e.data.index, false);
      if (e.data?.type === 'hello') this.broadcast();
    });
  }

  start() {
    this.setTheme(this.storedTheme() ?? this.deck.theme ?? 'dark');
    this.renderer.resize();
    // preload every screen so walls never pop in late
    for (const s of this.deck.slides) for (const it of layoutSlideSafe(this.deck, s.id)) if (it.t === 'image') load(it.src);
    addEventListener('resize', () => { this.renderer.resize(); this.kick(); });
    addEventListener('hashchange', () => this.go(this.fromHash(), false));
    this.go(this.fromHash(), false);
  }

  get total() { return this.deck.slides.length; }

  go(i: number, updateHash = true) {
    const index = Math.max(0, Math.min(this.total - 1, i));
    if (index !== this.index) this.extra = [];
    this.index = index;
    this.hooks.onEnter?.(index, layoutSlide(this.deck, index));
    this.items = [...layoutSlide(this.deck, index), ...this.extra];
    const now = performance.now();
    this.engine.goto(slotsOf(this.items), progressLength(index, this.total), now);
    this.imageStart = now + (this.engine.reduced ? 0 : 260);
    if (updateHash) history.replaceState(null, '', `#${this.deck.slides[index].id}`);
    const sr = document.getElementById('sr');
    if (sr) sr.textContent = srText(this.items);
    this.broadcast();
    this.kick();
  }

  /** Replace the live items on the current slide; changed slots flap. */
  setExtra(items: Item[]) {
    this.extra = items;
    this.items = [...layoutSlide(this.deck, this.index), ...items];
    this.engine.goto(slotsOf(this.items), progressLength(this.index, this.total), performance.now());
    this.kick();
  }

  next() { this.go(this.index + 1); }
  prev() { this.go(this.index - 1); }

  setTheme(name: ThemeName) {
    document.documentElement.dataset.theme = name;
    this.renderer.setTheme(name);
    try { localStorage.setItem('dot-board-theme', name); } catch { /* storage blocked */ }
    this.kick();
  }
  toggleTheme() { this.setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'); }

  private storedTheme(): ThemeName | null {
    try { const v = localStorage.getItem('dot-board-theme'); return v === 'light' || v === 'dark' ? v : null; } catch { return null; }
  }

  private fromHash(): number {
    const id = location.hash.slice(1);
    const i = this.deck.slides.findIndex((s) => s.id === id);
    return i < 0 ? 0 : i;
  }

  private broadcast() { this.channel?.postMessage({ type: 'state', index: this.index }); }

  /** Run the draw loop until everything settles. Cursors keep a slow tick going. */
  kick() {
    if (this.raf) return;
    const loop = () => {
      this.raf = 0;
      const t = performance.now();
      this.frame.clear();
      blocksOf(this.items, this.frame);
      let moving = this.engine.render(this.frame, t);
      const r = revealImages(this.frame, imagesOf(this.items), this.imageStart, t, this.engine.reduced);
      moving = r.moving || moving;
      if (this.hooks.overlay?.(this.frame, t)) moving = true;
      this.renderer.draw(this.frame, r.layers);
      const hasCursor = this.items.some((it) => it.t === 'text' && it.cursor) || this.items.some((it) => it.t === 'ask');
      if (moving) this.raf = requestAnimationFrame(loop);
      else if (hasCursor) this.raf = window.setTimeout(() => { this.raf = 0; this.kick(); }, 100) as unknown as number;
    };
    this.raf = requestAnimationFrame(loop);
  }
}

function layoutSlideSafe(deck: Deck, id: string): Item[] {
  const i = deck.slides.findIndex((s) => s.id === id);
  return i < 0 ? [] : layoutSlide(deck, i);
}

/** Screen-reader text for the current slide. */
function srText(items: Item[]): string {
  return items.map((it) => (it.t === 'text' && !it.cursor ? it.text : it.t === 'image' ? it.alt : '')).filter(Boolean).join('. ');
}
