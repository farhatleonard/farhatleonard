// La carte : la page défile normalement (pas de défilement piégé). La scène reste fixe et
// le plateau tourne en suivant le défilement. Flèches, clavier et liste de noms
// font défiler la page jusqu'à la création voulue.
export async function init({ readDrinks, reducedMotion, loader, sound, lenis }) {
  const main = document.querySelector('.carte');
  const container = document.querySelector('[data-stage="carte"]');
  const drinks = readDrinks();
  const n = drinks.length;
  const dots = [...document.querySelectorAll('[data-goto]')];
  const live = document.createElement('p');
  live.className = 'visually-hidden';
  live.setAttribute('aria-live', 'polite');
  main.append(live);

  main.classList.add('is-staged');
  main.style.setProperty('--count', n);
  const track = main.querySelector('.carte__track');

  // Défilement → position continue sur le plateau (0 … n-1)
  const progress = () => {
    const r = track.getBoundingClientRect();
    const total = r.height - innerHeight;
    return Math.min(1, Math.max(0, -r.top / total)) * (n - 1);
  };
  const scrollToIndex = (i) => {
    i = Math.max(0, Math.min(n - 1, i));
    const r = track.getBoundingClientRect();
    const total = r.height - innerHeight;
    const y = scrollY + r.top + (i / (n - 1)) * total;
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  let current = -1;
  let stage = null;
  const update = () => {
    const f = progress();
    stage?.setTarget(f);
    const i = Math.round(f);
    if (i === current) return;
    if (current !== -1) sound.play('tink');
    current = i;
    drinks.forEach((d, k) => d.el.classList.toggle('is-active', k === i));
    dots.forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
    live.textContent = `${drinks[i].name}, ${drinks[i].sub}`;
  };

  dots.forEach((b) => b.addEventListener('click', () => scrollToIndex(+b.dataset.goto)));
  main.querySelector('[data-prev]').addEventListener('click', () => scrollToIndex(current - 1));
  main.querySelector('[data-next]').addEventListener('click', () => scrollToIndex(current + 1));
  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowRight') scrollToIndex(current + 1);
    if (e.key === 'ArrowLeft') scrollToIndex(current - 1);
  });
  window.addEventListener('scroll', update, { passive: true });
  update();

  loader.progress(55);
  const { createStage } = await import('../three/stage.js');
  loader.progress(75);
  stage = await createStage(container, { drinks, mode: 'carte', reducedMotion, onFirstFrame: () => loader.finish() });
  if (!stage) {
    container.classList.add('stage--fallback');
    loader.finish();
    return;
  }
  stage.setTarget(progress());
  await loader.done;
  stage.fillIn();
}
