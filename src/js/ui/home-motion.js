// Accueil : les séquences animées sous l'écran d'ouverture.
// Règles (skill officiel GSAP) : transformations et opacité, scrub léger, ScrollTrigger sur les animations
// de premier niveau, créés dans l'ordre de la page ; « matchMedia » pour séparer ordinateur et mobile.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initFooterMotion } from './motion.js';

gsap.registerPlugin(ScrollTrigger);

export function initHomeMotion({ reducedMotion }) {
  if (reducedMotion) return;

  // 1. Manifeste : les mots s'allument un à un au défilement
  const words = document.querySelectorAll('.manifesto__title .w');
  if (words.length) {
    gsap.fromTo(words, { opacity: 0.38 }, { // départ encore lisible (contraste suffisant pour un grand texte)
      opacity: 1, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: '.manifesto__title', start: 'top 80%', end: 'bottom 45%', scrub: 0.5 },
    });
  }

  const mm = gsap.matchMedia();

  // 2. La carte en couleurs : section figée, panneaux qui défilent horizontalement (ordinateur)
  mm.add('(min-width: 861px)', () => {
    const section = document.querySelector('[data-spectrum]');
    if (!section) return;
    section.classList.add('is-pinned');
    const pin = section.querySelector('.spectrum__pin');
    const head = section.querySelector('.spectrum__head');
    const track = section.querySelector('[data-spectrum-track]');
    const distance = () => track.scrollWidth + head.offsetWidth - window.innerWidth;
    const slide = gsap.to([head, track], {
      x: () => -distance(), ease: 'none',
      scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + distance(), pin: true, scrub: 0.8, invalidateOnRefresh: true },
    });
    // Dans chaque panneau, le nom glisse un peu moins vite que le panneau : effet de profondeur
    track.querySelectorAll('[data-panel-name]').forEach((name) => {
      gsap.fromTo(name, { xPercent: 18 }, {
        xPercent: -8, ease: 'none',
        scrollTrigger: { trigger: name.closest('.panel'), containerAnimation: slide, start: 'left right', end: 'right left', scrub: true },
      });
    });
    return () => section.classList.remove('is-pinned');
  });

  // 3. La méthode : chaque carte recule quand la suivante arrive
  const cards = [...document.querySelectorAll('[data-stack-card]')];
  cards.slice(0, -1).forEach((card, i) => {
    gsap.to(card, {
      scale: 0.94 + i * 0.015, '--dim': 0.45, ease: 'none',
      scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 30%', scrub: 0.6 },
    });
  });

  // 4. Bandeau : défilement continu, accéléré par la vitesse de défilement, sens inversé en remontant
  const loops = [...document.querySelectorAll('[data-ribbon]')].map((row) => {
    const dir = Number(row.dataset.ribbon);
    return {
      dir,
      tween: gsap.fromTo(row, { xPercent: dir > 0 ? 0 : -50 }, { xPercent: dir > 0 ? -50 : 0, duration: dir > 0 ? 38 : 46, ease: 'none', repeat: -1 }),
    };
  });
  if (loops.length) {
    let sign = 1;
    ScrollTrigger.create({
      trigger: '.ribbon', start: 'top bottom', end: 'bottom top',
      onUpdate: (self) => {
        const v = self.getVelocity();
        if (v) sign = v > 0 ? 1 : -1;
        const boost = 1 + Math.min(Math.abs(v) / 250, 5);
        loops.forEach(({ tween }) => {
          gsap.to(tween, { timeScale: boost * sign, duration: 0.2, overwrite: true });
          gsap.to(tween, { timeScale: sign, duration: 1.2, delay: 0.2, ease: 'power2.out' });
        });
      },
    });
  }

  // 5. Pied de page, en dernier, puis recalcul des positions
  initFooterMotion();
  ScrollTrigger.refresh();
}
