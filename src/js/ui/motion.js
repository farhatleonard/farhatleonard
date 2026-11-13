// Effets liés au défilement (ScrollTrigger), volontairement discrets.
// Règles suivies (skill officiel GSAP) : transformations et opacité uniquement, « scrub » léger,
// déclencheurs créés dans l'ordre de la page, aucun effet si le visiteur demande moins d'animations.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initMotion({ reducedMotion }) {
  if (reducedMotion) return;
  const page = document.body.dataset.page;

  // Accueil : en quittant l'écran d'ouverture, la scène 3D recule et s'assombrit
  const hero = document.querySelector('.home-hero');
  if (hero) {
    gsap.to(hero.querySelector('.stage'), {
      yPercent: 12, scale: 0.94, autoAlpha: 0.35, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 },
    });
    gsap.to(hero.querySelector('.home-hero__text'), {
      yPercent: -18, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 },
    });
  }

  if (page === 'agence') {
    // Les numéros de la méthode glissent un peu moins vite que le texte : profondeur légère
    document.querySelectorAll('.step').forEach((step) => {
      gsap.fromTo(step.querySelector('.step__num'), { yPercent: 35 }, {
        yPercent: -15, ease: 'none',
        scrollTrigger: { trigger: step, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
      });
    });
    // Les deux lignes « Pour qui, pour quoi » dérivent en sens opposés
    document.querySelectorAll('.audience__line').forEach((line, i) => {
      gsap.fromTo(line, { xPercent: i ? -3 : 3 }, {
        xPercent: i ? 2 : -2, ease: 'none',
        scrollTrigger: { trigger: line, start: 'top bottom', end: 'bottom top', scrub: 1 },
      });
    });
    // Les cadres de l'équipe : léger zoom arrière à l'entrée
    document.querySelectorAll('.member__photo > *').forEach((img) => {
      gsap.fromTo(img, { scale: 1.12 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'center center', scrub: 0.8 },
      });
    });
  }

  // Sur l'accueil, le pied de page est animé après les séquences (ordre de la page)
  if (page !== 'accueil') initFooterMotion();
}

// Pied de page : le grand nom monte en place quand on arrive en bas de page
export function initFooterMotion() {
  const footerName = document.querySelector('.site-footer__name');
  if (!footerName) return;
  gsap.fromTo(footerName, { yPercent: 40, autoAlpha: 0.2 }, {
    yPercent: 0, autoAlpha: 1, ease: 'none',
    scrollTrigger: { trigger: '.site-footer', start: 'top bottom', end: 'top 35%', scrub: 0.8 },
  });
}
