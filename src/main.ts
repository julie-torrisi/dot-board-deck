import './style.css';
import { DeckApp } from './app';
import { loadDeck } from './load';
import { bindKeys, showHint } from './controls';
import { startPresenter } from './presenter';
import { Icebreaker } from './ask';

const params = new URLSearchParams(location.search);

loadDeck().then((deck) => {
  if (params.has('presenter')) return startPresenter(deck);
  const app = new DeckApp(document.getElementById('board') as HTMLCanvasElement, deck);
  const ice = new Icebreaker(app, deck);
  app.hooks.onEnter = (_i, items) => ice.enter(items);
  bindKeys(app);
  app.start();
  showHint();
});
