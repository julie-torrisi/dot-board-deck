import './style.css';
import { DeckApp } from './app';
import { loadDeck } from './load';
import { bindKeys, showHint } from './controls';
import { startPresenter } from './presenter';

const params = new URLSearchParams(location.search);

loadDeck().then((deck) => {
  if (params.has('presenter')) return startPresenter(deck);
  const app = new DeckApp(document.getElementById('board') as HTMLCanvasElement, deck);
  bindKeys(app);
  app.start();
  showHint();
});
