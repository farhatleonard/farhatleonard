// Défilement fluide (Lenis) sur ordinateur, piloté par l'horloge de GSAP et synchronisé avec ScrollTrigger
// (méthode recommandée par le skill officiel GSAP). Sur écran tactile, le défilement natif est conservé.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initScroll({ reducedMotion }) {
  if (reducedMotion || matchMedia('(pointer: coarse)').matches) return null;
  const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9, autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  // Ancres internes (lien d'évitement…)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    const target = document.querySelector(a.getAttribute('href'));
    if (target) lenis.scrollTo(target, { offset: -80 });
  });
  // Les positions sont recalculées une fois les polices chargées
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  return lenis;
}
