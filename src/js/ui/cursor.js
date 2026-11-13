// Curseur discret et boutons « magnétiques » (souris uniquement).
// gsap.quickTo réutilise une seule animation par propriété : la méthode recommandée pour suivre la souris.
import { gsap } from 'gsap';

export function initCursor({ reducedMotion }) {
  if (reducedMotion || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const dot = document.createElement('div');
  dot.className = 'cursor';
  dot.setAttribute('aria-hidden', 'true');
  document.body.append(dot);
  document.documentElement.classList.add('has-cursor');
  gsap.set(dot, { x: -100, y: -100 });
  const xTo = gsap.quickTo(dot, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(dot, 'y', { duration: 0.35, ease: 'power3' });
  window.addEventListener('pointermove', (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
    dot.classList.toggle('is-link', !!e.target.closest('a, button, label, select, input, textarea'));
  });
  document.addEventListener('pointerleave', () => {
    xTo(-100);
    yTo(-100);
  });

  // Boutons magnétiques : ils glissent légèrement vers la souris, puis reviennent en place
  document.querySelectorAll('.button, .carte__arrow, .sound-toggle, .cta__button').forEach((el) => {
    const mx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
    const my = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      mx((e.clientX - (r.left + r.width / 2)) * 0.25);
      my((e.clientY - (r.top + r.height / 2)) * 0.35);
    });
    el.addEventListener('pointerleave', () => {
      mx(0);
      my(0);
    });
  });
}
