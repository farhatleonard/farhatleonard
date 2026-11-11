// Sons de verre, synthétisés (aucun fichier à télécharger) : un « tintement » cristallin très bref.
// Coupés par défaut. Le choix du visiteur est mémorisé sur son appareil.
export function initSound() {
  const btn = document.querySelector('[data-sound-toggle]');
  const label = btn?.querySelector('.sound-toggle__label');
  let ctx = null;
  let on = false;
  try {
    on = localStorage.getItem('son') === '1';
  } catch {}

  const ensure = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  // Tintement : quelques partiels inharmoniques (comme un verre en cristal), attaque nette, extinction rapide.
  const play = (kind = 'tink') => {
    if (!on) return;
    const ac = ensure();
    const t = ac.currentTime;
    const master = ac.createGain();
    master.gain.value = kind === 'soft' ? 0.035 : 0.06;
    master.connect(ac.destination);
    const base = kind === 'soft' ? 1760 : 2350 + Math.random() * 180;
    [1, 2.32, 4.25, 6.63].forEach((ratio, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.value = base * ratio;
      const peak = [1, 0.45, 0.22, 0.1][i];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'soft' ? 0.5 : 0.9) / (1 + i * 0.7));
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 1);
    });
  };

  const sync = () => {
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Couper le son' : 'Activer le son');
  };
  if (btn) {
    btn.hidden = false;
    sync();
    btn.addEventListener('click', () => {
      on = !on;
      try {
        localStorage.setItem('son', on ? '1' : '0');
      } catch {}
      sync();
      if (on) play('soft');
    });
  }
  return { play };
}
