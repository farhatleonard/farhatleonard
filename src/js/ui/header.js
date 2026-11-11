// En-tête : se cache quand on descend, réapparaît quand on remonte. Menu plein écran sur mobile.
export function initHeader({ lenis }) {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  let last = 0;
  const onScroll = () => {
    const y = window.scrollY;
    const open = header.classList.contains('is-open');
    header.classList.toggle('is-scrolled', y > 40 && document.body.dataset.page !== 'carte');
    if (!open) header.classList.toggle('is-hidden', y > 160 && y > last + 2);
    if (y < last - 2) header.classList.remove('is-hidden');
    last = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  const toggle = header.querySelector('[data-menu-toggle]');
  const label = header.querySelector('[data-menu-label]');
  if (!toggle) return;
  toggle.hidden = false;
  const setOpen = (open) => {
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'Fermer' : 'Menu';
    document.documentElement.style.overflow = open ? 'hidden' : '';
    open ? lenis?.stop() : lenis?.start();
  };
  toggle.addEventListener('click', () => setOpen(!header.classList.contains('is-open')));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));
  header.querySelectorAll('[data-menu] a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
}
