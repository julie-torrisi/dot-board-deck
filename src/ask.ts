// "Ask the board": the audience types a prompt and the reply flaps onto the board.

import type { DeckApp } from './app';
import type { Deck, Item, TextItem } from './deck';
import { sanitize, wrap } from './glyphs';
import { ASK } from './layout';

export const CANNED = 'SIGNAL LOST. ASK AGAIN.';
const CLIENT_TIMEOUT = 6500;

const line = (text: string, i: number, ink: 'ink' | 'grey' = 'ink'): TextItem =>
  ({ t: 'text', role: 'h1', col: ASK.col, row: ASK.row + i * ASK.step, text, ink });

/** Wrap a reply to 23 H1 characters per line from col 34, at most 3 lines. */
export function replyItems(reply: string, ink: 'ink' | 'grey' = 'ink'): Item[] {
  const lines = wrap(sanitize(reply.replace(/\n/g, ' ')), ASK.perLine, ASK.lines);
  return lines.map((l, i) => line(l, i, ink));
}

export class Icebreaker {
  private input = document.createElement('input');
  private offline = 0;
  private busy = false;

  constructor(private app: DeckApp, private deck: Deck, private endpoint = 'api/ask') {
    const el = this.input;
    el.className = 'ask';
    el.maxLength = 120;
    el.placeholder = 'TYPE A QUESTION, PRESS ENTER';
    el.setAttribute('aria-label', 'Ask the board a question');
    el.hidden = true;
    document.body.append(el);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.ask(el.value); }
      if (e.key === 'Escape') el.blur();
      e.stopPropagation();
    });
    addEventListener('resize', () => this.place());
    addEventListener('keydown', (e) => {
      if (e.key !== 'a' && e.key !== 'A') return;
      if (document.activeElement === el) return;
      const i = deck.slides.findIndex((s) => s.template === 'ask');
      if (i >= 0) app.go(i);
    });
  }

  /** Called on every slide change. */
  enter(items: Item[]) {
    const here = items.some((i) => i.t === 'ask');
    this.input.hidden = !here;
    if (!here) return;
    this.input.value = '';
    queueMicrotask(() => {
      this.app.setExtra(replyItems('ASK ME ANYTHING.', 'grey'));
      this.place();
      this.input.focus({ preventScroll: true });
    });
  }

  /** Sit the input on the grid, under the reply lines. */
  private place() {
    const r = this.app.renderer.cellRect(ASK.col, ASK.row + ASK.lines * ASK.step + 6, 23 * 12, 12);
    const dpr = window.devicePixelRatio || 1;
    Object.assign(this.input.style, {
      left: `${r.x / dpr}px`, top: `${r.y / dpr}px`, width: `${r.w / dpr}px`, height: `${r.h / dpr}px`,
      fontSize: `${(r.h / dpr) * 0.55}px`,
    });
  }

  async ask(prompt: string) {
    const q = prompt.trim();
    if (!q || this.busy) return;
    this.busy = true;
    this.app.setExtra(replyItems('THINKING', 'grey'));
    const reply = await this.fetchReply(q);
    this.app.setExtra(replyItems(reply));
    this.input.value = '';
    this.busy = false;
  }

  private nextOffline(): string {
    const list = this.deck.offlineReplies?.length ? this.deck.offlineReplies : [CANNED];
    return list[this.offline++ % list.length];
  }

  private async fetchReply(prompt: string): Promise<string> {
    if (!navigator.onLine) return this.nextOffline();
    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt, bio: this.deck.bio ?? '' }),
        signal: AbortSignal.timeout(CLIENT_TIMEOUT),
      });
      const data = await res.json().catch(() => null);
      if (!data || data.offline) return this.nextOffline(); // no API here or no key set: stay on script
      return typeof data?.reply === 'string' ? data.reply : CANNED;
    } catch (err) {
      return err instanceof TypeError ? this.nextOffline() : CANNED;
    }
  }
}
