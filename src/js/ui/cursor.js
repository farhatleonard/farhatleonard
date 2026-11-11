// Curseur discret (souris uniquement) : un point qui s'agrandit sur les éléments cliquables.
export function initCursor({ reducedMotion }) {
  if (reducedMotion || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const dot = document.createElement('div');
  dot.className = 'cursor';
  dot.setAttribute('aria-hidden', 'true');
  document.body.append(dot);
  document.documentElement.classList.add('has-cursor');
  const pos = { x: -100, y: -100, sx: -100, sy: -100 };
  window.addEventListener('pointermove', (e) => {
    pos.x = e.clientX;
    pos.y = e.clientY;
    dot.classList.toggle('is-link', !!e.target.closest('a, button, label, select, input, textarea'));
  });
  document.addEventListener('pointerleave', () => (pos.x = pos.y = -100));
  const tick = () => {
    pos.sx += (pos.x - pos.sx) * 0.3;
    pos.sy += (pos.y - pos.sy) * 0.3;
    dot.style.transform = `translate3d(${pos.sx}px, ${pos.sy}px, 0)`;
    requestAnimationFrame(tick);
  };
  tick();
}
