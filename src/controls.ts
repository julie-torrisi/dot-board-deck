import type { DeckApp } from './app';

export function bindKeys(app: DeckApp) {
  addEventListener('keydown', (e) => {
    const typing = (e.target as HTMLElement)?.tagName === 'INPUT';
    if (typing) return;
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); app.next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); app.prev(); }
    else if (e.key === 'Home') app.go(0);
    else if (e.key === 'End') app.go(app.total - 1);
    else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    else if (e.key === 't' || e.key === 'T') app.toggleTheme();
    else if (e.key === 'n' || e.key === 'N') window.open(`${location.pathname}?presenter${location.hash}`, 'dot-board-notes', 'width=720,height=520');
  });
  document.getElementById('board')!.addEventListener('click', (e) => {
    if (e.clientX < innerWidth / 3) app.prev(); else app.next();
  });
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}

/** Tiny hint for 3 seconds, first load only. */
export function showHint() {
  try { if (localStorage.getItem('dot-board-hint')) return; localStorage.setItem('dot-board-hint', '1'); } catch { /* show anyway */ }
  const el = document.createElement('div');
  el.className = 'hint';
  el.textContent = 'ARROWS: MOVE  /  A: ASK  /  F: FULLSCREEN  /  T: THEME  /  N: NOTES';
  document.body.append(el);
  setTimeout(() => el.classList.add('out'), 3000);
  setTimeout(() => el.remove(), 3600);
}
