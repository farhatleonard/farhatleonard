import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

// Accueil : un seul moment orchestré. Les verres se remplissent pendant que la phrase apparaît
// ligne à ligne. Ensuite, le plateau tourne lentement d'une création à l'autre.
export async function init({ readDrinks, reducedMotion }) {
  const container = document.querySelector('[data-stage="home"]');
  const drinks = readDrinks();
  const nameEl = document.querySelector('[data-now-name]');
  const subEl = document.querySelector('[data-now-sub]');
  const title = document.querySelector('.home-hero__title');

  if (!reducedMotion) {
    await document.fonts.ready;
    const split = SplitText.create(title, { type: 'lines', mask: 'lines', linesClass: 'line' });
    gsap.from(split.lines, { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.09, delay: 0.35 });
    gsap.from(['.home-hero__kicker', '.home-hero .link-cta', '.home-hero__now'], {
      autoAlpha: 0, duration: 1, ease: 'power2.out', stagger: 0.12, delay: 1.1,
    });
  }

  const showName = (i) =>
    gsap.to([nameEl, subEl], {
      autoAlpha: 0, y: -8, duration: 0.3, ease: 'power2.in', overwrite: true,
      onComplete: () => {
        nameEl.textContent = drinks[i].name;
        subEl.textContent = drinks[i].sub;
        gsap.fromTo([nameEl, subEl], { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.05 });
      },
    });

  const { createStage } = await import('../three/stage.js');
  const stage = await createStage(container, { drinks, mode: 'home', reducedMotion, onActive: showName });
  if (!stage) {
    container.classList.add('stage--fallback');
    return;
  }
  stage.fillIn();

  // Le plateau tourne d'une création à l'autre (sauf mouvement réduit)
  if (reducedMotion) return;
  let k = 0;
  setInterval(() => {
    if (!document.hidden) stage.goTo(++k);
  }, 5200);
}
