// La carte : la page défile normalement (pas de défilement piégé). La scène reste fixe,
// et chaque portion de défilement correspond à une création. Flèches, clavier et liste de noms
// font défiler la page jusqu'à la création voulue.
export async function init({ readDrinks, reducedMotion }) {
  const main = document.querySelector('.carte');
  const container = document.querySelector('[data-stage="carte"]');
  const drinks = readDrinks();
  const dots = [...document.querySelectorAll('[data-goto]')];
  const live = document.createElement('p');
  live.className = 'visually-hidden';
  live.setAttribute('aria-live', 'polite');
  main.append(live);

  main.classList.add('is-staged');
  main.style.setProperty('--count', drinks.length);

  let current = -1;
  const setActive = (i) => {
    if (i === current) return;
    current = i;
    drinks.forEach((d, k) => d.el.classList.toggle('is-active', k === i));
    dots.forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
    main.style.setProperty('--c1', drinks[i].c1);
    live.textContent = `${drinks[i].name}, ${drinks[i].el.querySelector('.drink__sub').textContent}`;
    stage?.goTo(i);
  };

  // Position de défilement → création
  const track = main.querySelector('.carte__track');
  const indexFromScroll = () => {
    const r = track.getBoundingClientRect();
    const total = r.height - innerHeight;
    const p = Math.min(0.9999, Math.max(0, -r.top / total));
    return Math.floor(p * drinks.length);
  };
  const scrollToIndex = (i) => {
    i = Math.max(0, Math.min(drinks.length - 1, i));
    const r = track.getBoundingClientRect();
    const total = r.height - innerHeight;
    const y = scrollY + r.top + ((i + 0.5) / drinks.length) * total;
    window.scrollTo({ top: y, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  dots.forEach((b) => b.addEventListener('click', () => scrollToIndex(+b.dataset.goto)));
  main.querySelector('[data-prev]').addEventListener('click', () => scrollToIndex(current - 1));
  main.querySelector('[data-next]').addEventListener('click', () => scrollToIndex(current + 1));
  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowRight') scrollToIndex(current + 1);
    if (e.key === 'ArrowLeft') scrollToIndex(current - 1);
  });

  let stage = null;
  setActive(indexFromScroll());
  window.addEventListener('scroll', () => setActive(indexFromScroll()), { passive: true });

  const { createStage } = await import('../three/stage.js');
  stage = await createStage(container, { drinks, mode: 'carte', reducedMotion });
  if (!stage) {
    container.classList.add('stage--fallback');
    return;
  }
  stage.fillIn();
  if (current > 0) stage.goTo(current);
}
