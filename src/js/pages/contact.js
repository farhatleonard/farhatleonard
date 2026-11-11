// Formulaire de contact : vérification des champs avec messages clairs, envoi à Netlify Forms
// sans quitter la page, puis confirmation. Sans JavaScript, le formulaire s'envoie normalement.
import { gsap } from 'gsap';

export function init({ reducedMotion, sound }) {
  const form = document.querySelector('[data-form]');
  if (!form) return;
  const msg = JSON.parse(form.querySelector('[data-messages]').innerHTML.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
  const status = form.querySelector('[data-status]');
  const submit = form.querySelector('[data-submit]');
  const done = form.querySelector('[data-done]');

  // Libellé flottant des listes déroulantes facultatives
  form.querySelectorAll('.field--select select').forEach((s) => {
    const sync = () => s.closest('.field').classList.toggle('has-value', !!s.value);
    s.addEventListener('change', sync);
    sync();
  });

  const rules = {
    nom: (v) => v.trim().length > 1,
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    evenement: (v) => !!v,
    message: (v) => v.trim().length > 5,
  };
  const setError = (name, text) => {
    const input = form.elements[name];
    const field = input.closest('.field, .consent');
    const err = form.querySelector(`#e-${name === 'consentement' ? 'consent' : name}`);
    field.classList.toggle('is-invalid', !!text);
    input.setAttribute('aria-invalid', text ? 'true' : 'false');
    err.textContent = text || '';
  };
  const check = (name) => {
    if (name === 'consentement') {
      const ok = form.elements.consentement.checked;
      setError(name, ok ? '' : msg.consentement);
      return ok;
    }
    const ok = rules[name](form.elements[name].value);
    setError(name, ok ? '' : msg[name]);
    return ok;
  };
  [...Object.keys(rules), 'consentement'].forEach((name) => {
    const input = form.elements[name];
    input.addEventListener('blur', () => input.value && check(name));
    input.addEventListener('change', () => input.closest('.is-invalid') && check(name));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const names = [...Object.keys(rules), 'consentement'];
    const bad = names.filter((n) => !check(n));
    if (bad.length) {
      status.textContent = msg.resume;
      form.elements[bad[0]].focus();
      return;
    }
    status.textContent = '';
    submit.disabled = true;
    try {
      const body = new URLSearchParams(new FormData(form)).toString();
      const res = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      if (!res.ok) throw new Error(res.status);
      sound.play('tink');
      form.classList.add('is-sent');
      done.hidden = false;
      done.focus();
      if (!reducedMotion) gsap.from(done.children, { y: 24, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08 });
    } catch {
      status.textContent = msg.envoi;
      submit.disabled = false;
    }
  });

  // Retour après un envoi sans JavaScript
  if (new URLSearchParams(location.search).has('envoye')) {
    form.classList.add('is-sent');
    done.hidden = false;
  }
}
