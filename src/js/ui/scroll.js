// Défilement fluide (Lenis) sur ordinateur. Sur écran tactile, le défilement natif est conservé.
import Lenis from 'lenis';

export function initScroll({ reducedMotion }) {
  if (reducedMotion || matchMedia('(pointer: coarse)').matches) return null;
  const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
  const raf = (t) => {
    lenis.raf(t);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
  // Ancres internes (lien d'évitement…)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    const target = document.querySelector(a.getAttribute('href'));
    if (target) lenis.scrollTo(target, { offset: -80 });
  });
  return lenis;
}
