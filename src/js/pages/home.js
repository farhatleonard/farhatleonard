import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

// Accueil : un seul moment orchestré. Le verre se remplit pendant que la phrase apparaît ligne à ligne.
// Ensuite, les créations se succèdent lentement dans le verre.
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

  const { createStage } = await import('../three/stage.js');
  const stage = await createStage(container, { drinks, mode: 'home', reducedMotion });
  if (!stage) {
    container.classList.add('stage--fallback');
    return;
  }
  stage.fillIn();

  // Les créations se succèdent dans le verre (sauf mouvement réduit)
  if (reducedMotion) return;
  let i = 0;
  setInterval(() => {
    if (document.hidden) return;
    i = (i + 1) % drinks.length;
    stage.goTo(i);
    gsap.to([nameEl, subEl], {
      autoAlpha: 0, y: -8, duration: 0.35, ease: 'power2.in',
      onComplete: () => {
        nameEl.textContent = drinks[i].name;
        subEl.textContent = drinks[i].sub;
        gsap.fromTo([nameEl, subEl], { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.05 });
      },
    });
  }, 5200);
}
