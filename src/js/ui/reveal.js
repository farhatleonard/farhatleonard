// Grands titres des pages de lecture : apparition ligne par ligne, une seule fois, quand ils entrent à l'écran.
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

export function initReveal({ reducedMotion, ready }) {
  if (reducedMotion) return;
  const els = document.querySelectorAll('.page-head__title, .block--end .link-cta, .cta__title, .spectrum__head h2');
  if (!els.length) return;
  document.fonts.ready.then(() => {
    els.forEach((el) => {
      const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line' });
      gsap.set(split.lines, { yPercent: 105 });
      const io = new IntersectionObserver(
        ([e]) => {
          if (!e.isIntersecting) return;
          io.disconnect();
          ready.then(() =>
            gsap.to(split.lines, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.08, onComplete: () => split.revert() }),
          );
        },
        { rootMargin: '0px 0px -10% 0px' },
      );
      io.observe(el);
    });
  });
}
