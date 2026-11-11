// Polices auto-hébergées (pas d'appel à Google : plus rapide et conforme RGPD).
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/archivo/wdth.css';

import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/pages.css';

const page = document.body.dataset.page;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');

// Les éléments utiles seulement avec JavaScript
document.querySelectorAll('[data-js-only]').forEach((el) => (el.hidden = false));

const readDrinks = () =>
  [...document.querySelectorAll('[data-drink]')].map((el) => ({
    el,
    name: el.dataset.name,
    sub: el.dataset.sub,
    glass: el.dataset.glass,
    c1: el.dataset.c1,
    c2: el.dataset.c2,
    garnish: el.dataset.garnish,
    sparkling: el.dataset.sparkling === 'true',
  }));

if (page === 'accueil') import('./pages/home.js').then((m) => m.init({ readDrinks, reducedMotion }));
if (page === 'carte') import('./pages/carte.js').then((m) => m.init({ readDrinks, reducedMotion }));
