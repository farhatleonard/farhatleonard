// Rideau de transition entre les pages : un aplat, dans la couleur d'une des créations, monte pour couvrir
// la page, la page suivante se charge, puis le rideau se retire vers le haut.
import { gsap } from 'gsap';

const KEY = 'rideau';

export function initCurtain({ reducedMotion }) {
  if (reducedMotion) return;
  const colors = (document.querySelector('[data-curtain]')?.dataset.curtain || '#7a3b1c').split(',').filter(Boolean);
  const el = document.createElement('div');
  el.className = 'curtain';
  el.setAttribute('aria-hidden', 'true');
  document.body.append(el);

  // Arrivée : si on vient d'une autre page du site, le rideau couvre l'écran puis se retire
  let incoming = null;
  try {
    incoming = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {}
  if (incoming) {
    el.style.setProperty('--curtain', incoming);
    gsap.set(el, { yPercent: 0 });
    gsap.to(el, { yPercent: -100, duration: 1, ease: 'expo.inOut', delay: 0.1 });
  } else {
    gsap.set(el, { yPercent: 100 });
  }

  // Départ : clic sur un lien interne
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname.startsWith('/admin')) return;
    if (url.pathname === location.pathname) return; // ancre ou même page : pas de rideau
    e.preventDefault();
    const color = colors[Math.floor(Math.random() * colors.length)];
    try {
      sessionStorage.setItem(KEY, color);
    } catch {}
    el.style.setProperty('--curtain', color);
    gsap.fromTo(el, { yPercent: 100 }, { yPercent: 0, duration: 0.75, ease: 'expo.inOut', onComplete: () => location.assign(url.href) });
  });

  // Retour arrière depuis le cache du navigateur : le rideau ne doit pas rester affiché
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) gsap.set(el, { yPercent: 100 });
  });
}
