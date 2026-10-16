import '@fontsource/doto/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import './style.css';
import { DeckApp } from './app';
import { loadDeck } from './load';
import { bindKeys, showHint } from './controls';
import { startPresenter } from './presenter';
import { Icebreaker } from './ask';

const params = new URLSearchParams(location.search);

const fontsReady = Promise.all([
  document.fonts.load('700 100px Doto'),
  document.fonts.load('400 48px Inter'),
  document.fonts.load('500 28px Inter'),
]).catch(() => undefined);

Promise.all([loadDeck(), fontsReady]).then(([deck]) => {
  if (params.has('presenter')) return startPresenter(deck);
  const app = new DeckApp(document.getElementById('board') as HTMLCanvasElement, deck);
  const ice = new Icebreaker(app, deck, deck.askEndpoint);
  app.hooks.onEnter = (_i, items) => ice.enter(items);
  bindKeys(app);
  app.start();
  showHint();
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode is a bonus */ }));
}
