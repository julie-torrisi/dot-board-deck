import type { DeckApp } from './app';

/**
 * Keys follow Figma presentation view:
 *   Right arrow, Space, N: next.  Left arrow: previous.  R: restart from the first slide.  F: fullscreen.
 * Plus: Home and End, PageUp and PageDown (clickers), T for theme, S for speaker notes.
 */
export function bindKeys(app: DeckApp) {
  addEventListener('keydown', (e) => {
    const typing = (e.target as HTMLElement)?.tagName === 'INPUT';
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === 'ArrowRight' || k === 'PageDown' || k === 'n' || (k === ' ' && !e.shiftKey)) { e.preventDefault(); app.next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || (k === ' ' && e.shiftKey)) { e.preventDefault(); app.prev(); }
    else if (k === 'r') app.restart();
    else if (k === 'Home') app.go(0);
    else if (k === 'End') app.go(app.total - 1);
    else if (k === 'f') toggleFullscreen();
    else if (k === 't') app.toggleTheme();
    else if (k === 's') window.open(`${location.pathname}?presenter${location.hash}`, 'dot-board-notes', 'width=720,height=520');
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
  el.textContent = 'ARROWS OR SPACE: MOVE  /  R: RESTART  /  F: FULLSCREEN  /  S: NOTES  /  T: THEME';
  document.body.append(el);
  setTimeout(() => el.classList.add('out'), 3000);
  setTimeout(() => el.remove(), 3600);
}
