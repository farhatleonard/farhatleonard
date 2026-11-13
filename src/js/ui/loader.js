// Écran de chargement (accueil et carte) : le compteur suit le vrai chargement
// (polices, puis scène 3D), avec une durée minimale pour éviter un flash.
// À la deuxième page visitée, il est raccourci.
import { gsap } from 'gsap';

export function initLoader({ reducedMotion }) {
  const el = document.querySelector('[data-loader]');
  let resolveDone;
  const done = new Promise((r) => (resolveDone = r));
  if (!el) {
    resolveDone();
    return { done, progress() {}, finish() {} };
  }
  let seen = false;
  try {
    seen = sessionStorage.getItem('loader-seen') === '1';
    sessionStorage.setItem('loader-seen', '1');
  } catch {}

  const count = el.querySelector('[data-loader-count]');
  const line = el.querySelector('[data-loader-line]');
  const state = { shown: 0, target: 0 };
  const minTime = seen || reducedMotion ? 0.3 : 1.4;
  const start = performance.now();
  const render = () => {
    count.textContent = String(Math.round(state.shown)).padStart(2, '0');
    line.style.transform = `scaleX(${state.shown / 100})`;
  };
  const tween = gsap.to(state, { shown: 0, duration: 0.1, onUpdate: render });

  const progress = (p) => {
    state.target = Math.max(state.target, Math.min(99, p));
    tween.kill();
    gsap.to(state, { shown: state.target, duration: 0.6, ease: 'power2.out', onUpdate: render });
  };
  document.fonts.ready.then(() => progress(35));

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    const wait = Math.max(0, minTime - (performance.now() - start) / 1000);
    gsap
      .timeline({ delay: wait, onComplete: () => { el.remove(); } })
      .to(state, { shown: 100, duration: 0.5, ease: 'power2.out', onUpdate: render })
      .add(() => {
        el.classList.add('is-done');
        resolveDone();
        setTimeout(() => el.remove(), 2500); // sécurité : retiré même si l'animation est ralentie
      }, '+=0.05')
      .to(el, { clipPath: 'inset(0 0 100% 0)', duration: reducedMotion ? 0.01 : 1, ease: 'expo.inOut' });
  };
  // Sécurité : jamais plus de 6 secondes d'attente
  setTimeout(finish, 6000);
  return { done, progress, finish };
}
