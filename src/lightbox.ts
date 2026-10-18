// Click any image to see it full size. Arrows move between the slide's images; Esc or a click outside closes.

export interface Shot { src: string; alt: string; caption?: string }

let open = false;
export const lightboxOpen = () => open;

export function showLightbox(shots: Shot[], start: number, onClose?: () => void) {
  if (!shots.length) return;
  let i = Math.max(0, Math.min(shots.length - 1, start));
  const prevFocus = document.activeElement as HTMLElement | null;
  const root = document.createElement('div');
  root.className = 'lightbox';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.innerHTML = `
    <figure><img alt="" /><figcaption><span class="lb-count"></span><span class="lb-cap"></span></figcaption></figure>
    <button class="lb-prev" aria-label="Previous image">&lsaquo;</button>
    <button class="lb-next" aria-label="Next image">&rsaquo;</button>
    <button class="lb-close" aria-label="Close">&times;</button>`;
  const img = root.querySelector('img')!;
  const count = root.querySelector('.lb-count')!;
  const cap = root.querySelector('.lb-cap')!;
  const prev = root.querySelector<HTMLButtonElement>('.lb-prev')!;
  const next = root.querySelector<HTMLButtonElement>('.lb-next')!;
  const show = () => {
    const s = shots[i];
    img.src = s.src;
    img.alt = s.alt;
    count.textContent = shots.length > 1 ? `${String(i + 1).padStart(2, '0')} / ${String(shots.length).padStart(2, '0')}` : '';
    cap.textContent = s.caption ?? s.alt;
    prev.hidden = next.hidden = shots.length < 2;
  };
  const go = (d: number) => { i = (i + d + shots.length) % shots.length; show(); };
  const close = () => {
    open = false;
    removeEventListener('keydown', onKey, true);
    root.remove();
    prevFocus?.focus?.({ preventScroll: true });
    onClose?.();
  };
  const onKey = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  };
  prev.addEventListener('click', (e) => { e.stopPropagation(); go(-1); });
  next.addEventListener('click', (e) => { e.stopPropagation(); go(1); });
  root.querySelector('.lb-close')!.addEventListener('click', (e) => { e.stopPropagation(); close(); });
  root.addEventListener('click', (e) => { if (e.target === root || e.target === root.querySelector('figure')) close(); });
  addEventListener('keydown', onKey, true);
  document.body.append(root);
  open = true;
  show();
  (root.querySelector('.lb-close') as HTMLButtonElement).focus({ preventScroll: true });
}
