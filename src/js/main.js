import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/pages.css';

import { initLoader } from './ui/loader.js';
import { initHeader } from './ui/header.js';
import { initCursor } from './ui/cursor.js';
import { initSound } from './ui/sound.js';
import { initScroll } from './ui/scroll.js';
import { initReveal } from './ui/reveal.js';
import { initMotion } from './ui/motion.js';
import { initCurtain } from './ui/curtain.js';

const page = document.body.dataset.page;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');
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
    photo: el.dataset.photo || '',
  }));

const loader = initLoader({ reducedMotion });
const lenis = initScroll({ reducedMotion });
initHeader({ lenis });
initCursor({ reducedMotion });
const sound = initSound();
initReveal({ reducedMotion, ready: loader.done });
initMotion({ reducedMotion });
initCurtain({ reducedMotion });

const ctx = { readDrinks, reducedMotion, loader, sound, lenis };
if (page === 'accueil') import('./pages/home.js').then((m) => m.init(ctx));
if (page === 'carte') import('./pages/carte.js').then((m) => m.init(ctx));
if (page === 'contact') import('./pages/contact.js').then((m) => m.init(ctx));
