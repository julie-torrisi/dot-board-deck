import type { Deck } from './deck';
import demo from './decks/demo.json';

/** A deck.json next to the page wins; otherwise the demo deck. */
export async function loadDeck(): Promise<Deck> {
  try {
    const res = await fetch('deck.json', { cache: 'no-cache' });
    if (res.ok && res.headers.get('content-type')?.includes('json')) return (await res.json()) as Deck;
  } catch { /* offline or missing */ }
  return demo as Deck;
}
