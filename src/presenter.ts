// Speaker notes in a second window, kept in sync through BroadcastChannel.

import type { Deck } from './deck';

export function startPresenter(deck: Deck) {
  document.getElementById('board')?.remove();
  document.body.classList.add('presenter');
  const root = document.createElement('main');
  root.innerHTML = `<header><span id="pg"></span><span id="clock">00:00</span></header>
    <h1 id="label"></h1><p id="notes"></p><footer>NEXT: <span id="next"></span></footer>`;
  document.body.append(root);
  const $ = (id: string) => document.getElementById(id)!;
  const ch = new BroadcastChannel('dot-board');
  let index = 0;
  const started = Date.now();

  const show = (i: number) => {
    index = i;
    const s = deck.slides[i];
    $('pg').textContent = `PG ${String(i + 1).padStart(2, '0')}/${String(deck.slides.length).padStart(2, '0')}`;
    $('label').textContent = s.label;
    $('notes').textContent = s.notes ?? 'No notes for this slide.';
    $('next').textContent = deck.slides[i + 1]?.label ?? 'END';
  };
  ch.addEventListener('message', (e) => { if (e.data?.type === 'state') show(e.data.index); });
  addEventListener('keydown', (e) => {
    const to = e.key === 'ArrowRight' || e.key === ' ' ? index + 1 : e.key === 'ArrowLeft' ? index - 1 : null;
    if (to === null) return;
    const i = Math.max(0, Math.min(deck.slides.length - 1, to));
    show(i);
    ch.postMessage({ type: 'goto', index: i });
  });
  setInterval(() => {
    const s = Math.floor((Date.now() - started) / 1000);
    $('clock').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }, 1000);
  show(0);
  ch.postMessage({ type: 'hello' });
}
