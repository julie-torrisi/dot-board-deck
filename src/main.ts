import './style.css';
import { Renderer, Frame } from './grid';
import { layoutSlide, progressLength } from './layout';
import { slotsOf, blocksOf, drawChar, drawProgress } from './board';
import type { Deck } from './deck';
import demo from './decks/demo.json';

const deck = demo as Deck;
const canvas = document.getElementById('board') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const frame = new Frame();
let index = 0;

function render() {
  frame.clear();
  const items = layoutSlide(deck, index);
  blocksOf(items, frame);
  for (const s of slotsOf(items).values()) drawChar(frame, s.role, s.col, s.row, s.ch, s.ink);
  drawProgress(frame, progressLength(index, deck.slides.length));
  renderer.draw(frame);
}

renderer.resize();
render();
addEventListener('resize', () => { renderer.resize(); render(); });
addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === ' ') index = Math.min(index + 1, deck.slides.length - 1);
  if (e.key === 'ArrowLeft') index = Math.max(index - 1, 0);
  render();
});
