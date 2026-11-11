// Fabrique le HTML de chaque page à partir de src/content/site.json, au moment de la construction.
// Le HTML final est statique : lisible sans JavaScript, bien référencé, compatible Netlify Forms.

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Les placeholders [À COMPLÉTER], [PHOTO À FOURNIR], [NOM À CHOISIR]… restent visibles à l'écran.
const TODO = /\[[^\]]*À (COMPLÉTER|FOURNIR|CHOISIR|VÉRIFIER)\]/g;

const GLASS_LABELS = { coupe: 'Coupe', flute: 'Flûte', martini: 'Verre à martini', tumbler: 'Verre bas', highball: 'Verre haut' };

export const PAGES = {
  accueil: '/',
  carte: '/carte/',
  agence: '/agence/',
  contact: '/contact/',
  legal: '/mentions-legales/',
};

export function createRenderer(content, lang = content.langueParDefaut) {
  const t = content[lang];
  const nom = content.nom;
  const withName = (s) => String(s).replaceAll('{{NOM}}', nom);
  const txt = (s) => esc(withName(s)).replace(TODO, (m) => `<mark class="todo">${m}</mark>`);
  const raw = (s) => esc(withName(s));

  // Liste en phrase : « Les marques, les agences… »
  const list = (items) => items.map((x, i) => txt(i ? x.charAt(0).toLowerCase() + x.slice(1) : x)).join(', ');

  const wordmark = (cls = '') => `<span class="wordmark ${cls}">${txt(nom)}</span>`;

  const header = (page) => `
  <a class="skip-link" href="#contenu">Aller au contenu</a>
  <header class="site-header">
    <a class="site-header__brand" href="/" ${page === 'accueil' ? 'aria-current="page"' : ''}>${wordmark()}</a>
    <nav class="site-header__nav" aria-label="Navigation principale">
      <ul>${t.nav.liens
        .map((l) => `<li><a href="${PAGES[l.page]}" ${l.page === page ? 'aria-current="page"' : ''}>${txt(l.label)}</a></li>`)
        .join('')}</ul>
    </nav>
    <button class="sound-toggle" type="button" aria-pressed="false" data-sound-toggle hidden>
      <span class="sound-toggle__wave" aria-hidden="true"></span>
      <span class="visually-hidden">${txt(t.nav.son.activer)}</span>
    </button>
  </header>`;

  const footer = () => `
  <footer class="site-footer">
    <div class="site-footer__inner">
      <p class="site-footer__name">${wordmark()}</p>
      <address class="site-footer__contact">
        <span>${txt(t.footer.email)}</span>
        <span>${txt(t.footer.telephone)}</span>
        <span>${txt(t.footer.adresse)}</span>
      </address>
      <ul class="site-footer__links">
        ${t.footer.reseaux.map((r) => `<li>${txt(r.label)} ${txt(r.url)}</li>`).join('')}
        <li><a href="${PAGES.legal}">Mentions légales et confidentialité</a></li>
      </ul>
      <p class="site-footer__health">${txt(t.footer.mentionSante)}</p>
    </div>
  </footer>`;

  // Une création de la carte. Sert à la fois de contenu accessible et de données pour la scène 3D.
  const drink = (c, i, group) => `
    <li class="drink" id="${group}-${i}" style="--c1:${esc(c.couleurs[0])}" data-drink
        data-name="${raw(c.nom)}" data-glass="${esc(c.verre)}" data-c1="${esc(c.couleurs[0])}" data-c2="${esc(c.couleurs[1])}" data-sub="${raw(c.sousTitre)}" data-group="${group}">
      <h3 class="drink__name">${txt(c.nom)}</h3>
      <p class="drink__sub">${txt(c.sousTitre)}</p>
      <p class="drink__desc">${txt(c.description)}</p>
      <dl class="drink__meta">
        <div><dt>${txt(t.carte.garnitureLabel)}</dt><dd>${txt(c.garniture)}</dd></div>
        <div><dt>${txt(t.carte.verreLabel)}</dt><dd>${esc(GLASS_LABELS[c.verre] || c.verre)}</dd></div>
      </dl>
    </li>`;

  const allDrinks = () => [
    ...t.carte.cocktails.map((c) => ({ ...c, group: 'cocktails' })),
    ...t.carte.sansAlcool.map((c) => ({ ...c, group: 'sans-alcool' })),
  ];

  // ---------- Pages ----------

  const pages = {
    accueil: () => `
    <main id="contenu" class="home">
      <section class="home-hero" aria-labelledby="home-titre">
        <div class="stage" data-stage="home" aria-hidden="true"></div>
        <div class="home-hero__text">
          <p class="home-hero__kicker">${txt(t.hero.descripteur)}</p>
          <h1 id="home-titre" class="home-hero__title" data-reveal>${txt(t.hero.phrase)}</h1>
          <a class="link-cta" href="${PAGES.carte}">${txt(t.hero.cta)}</a>
        </div>
        <p class="home-hero__now" aria-live="polite">
          <span class="home-hero__now-label">${txt(t.hero.enCeMoment)}</span>
          <span class="home-hero__now-name" data-now-name>${txt(t.carte.cocktails[0].nom)}</span>
          <span class="home-hero__now-sub" data-now-sub>${txt(t.carte.cocktails[0].sousTitre)}</span>
        </p>
        <ul hidden data-drinks>${allDrinks()
          .map((c) => `<li data-drink data-name="${raw(c.nom)}" data-sub="${raw(c.sousTitre)}" data-glass="${esc(c.verre)}" data-c1="${esc(c.couleurs[0])}" data-c2="${esc(c.couleurs[1])}"></li>`)
          .join('')}</ul>
      </section>
      <section class="home-intro" aria-labelledby="vision-titre">
        <h2 id="vision-titre" class="home-intro__title">${txt(t.vision.titre)}</h2>
        <p class="home-intro__text">${txt(t.vision.texte)}</p>
        <a class="link-cta" href="${PAGES.agence}">Notre méthode</a>
      </section>
    </main>`,

    carte: () => `
    <main id="contenu" class="carte">
     <div class="carte__track">
     <div class="carte__sticky">
      <div class="stage stage--carte" data-stage="carte" aria-hidden="true"></div>
      <div class="carte__head">
        <h1 class="carte__title">${txt(t.carte.titre)}</h1>
        <p class="carte__intro">${txt(t.carte.intro)}</p>
        <p class="carte__help" data-js-only hidden>${txt(t.carte.aide)}</p>
      </div>
      <div class="carte__groups">
        <section aria-labelledby="g-cocktails">
          <h2 id="g-cocktails" class="carte__group">${txt(t.carte.onglets.cocktails)}</h2>
          <ol class="drinks">${t.carte.cocktails.map((c, i) => drink(c, i, 'cocktails')).join('')}</ol>
        </section>
        <section aria-labelledby="g-sans-alcool">
          <h2 id="g-sans-alcool" class="carte__group">${txt(t.carte.onglets.sansAlcool)}</h2>
          <ol class="drinks">${t.carte.sansAlcool.map((c, i) => drink(c, i, 'sans-alcool')).join('')}</ol>
        </section>
      </div>
      <nav class="carte__nav" aria-label="Choisir une création" data-js-only hidden>
        <button type="button" class="carte__arrow" data-prev aria-label="${raw(t.carte.precedent)}">‹</button>
        <ol>${allDrinks()
          .map((c, i) => `<li><button type="button" data-goto="${i}" class="carte__dot ${c.group === 'sans-alcool' ? 'is-na' : ''}">${txt(c.nom)}</button></li>`)
          .join('')}</ol>
        <button type="button" class="carte__arrow" data-next aria-label="${raw(t.carte.suivant)}">›</button>
      </nav>
      <p class="carte__health">${txt(t.carte.mentionSante)}</p>
     </div>
     </div>
    </main>`,

    agence: () => `
    <main id="contenu" class="agence">
      <header class="page-head">
        <h1 class="page-head__title">${txt(t.vision.titre)}</h1>
        <p class="page-head__lead">${txt(t.vision.texte)}</p>
      </header>

      <section class="block" aria-labelledby="methode-titre">
        <h2 id="methode-titre" class="block__title">${txt(t.methode.libelle)}</h2>
        <ol class="steps">
          ${t.methode.etapes.map((e) => `
          <li class="step">
            <span class="step__num">${txt(e.numero)}</span>
            <h3 class="step__title">${txt(e.titre)}</h3>
            <p class="step__text">${txt(e.texte)}</p>
          </li>`).join('')}
        </ol>
      </section>

      <section class="block" aria-labelledby="sur-mesure-titre">
        <h2 id="sur-mesure-titre" class="block__title">${txt(t.surMesure.titre)}</h2>
        <div class="pairs pairs--3">
          ${t.surMesure.points.map((p) => `<div class="pair"><h3>${txt(p.titre)}</h3><p>${txt(p.texte)}</p></div>`).join('')}
        </div>
      </section>

      <section class="block" aria-labelledby="execution-titre">
        <h2 id="execution-titre" class="block__title">${txt(t.execution.titre)}</h2>
        <div class="pairs pairs--2">
          ${t.execution.points.map((p) => `<div class="pair"><h3>${txt(p.titre)}</h3><p>${txt(p.texte)}</p></div>`).join('')}
        </div>
      </section>

      <section class="block" aria-labelledby="pour-qui-titre">
        <h2 id="pour-qui-titre" class="block__title">${txt(t.pourQui.libelle)}</h2>
        <div class="audience">
          <p class="audience__line">${list(t.pourQui.clients)}.</p>
          <p class="audience__line audience__line--soft">${list(t.pourQui.occasions)}.</p>
        </div>
      </section>

      <section class="block" aria-labelledby="equipe-titre">
        <h2 id="equipe-titre" class="block__title">${txt(t.equipe.libelle)}</h2>
        <ul class="team">
          ${t.equipe.membres.map((m) => `
          <li class="member">
            <div class="member__photo" aria-hidden="true"><span>${txt(m.monogramme)}</span></div>
            <h3 class="member__name">${txt(m.prenom)}</h3>
            <p class="member__role">${txt(m.role)}. ${txt(m.detail)}</p>
            <p class="member__todo">${txt(m.bio)} ${txt(m.photo)}</p>
          </li>`).join('')}
        </ul>
      </section>

      <section class="block block--end">
        <a class="link-cta" href="${PAGES.contact}">${txt(t.contact.titre)}</a>
      </section>
    </main>`,

    contact: () => `
    <main id="contenu" class="contact">
      <header class="page-head">
        <h1 class="page-head__title">${txt(t.contact.titre)}</h1>
        <p class="page-head__lead">${txt(t.contact.intro)}</p>
      </header>
      <div class="contact__grid">
        <p class="contact__form-placeholder">Le formulaire arrive à l'étape « Formulaire de contact ».</p>
        <div class="contact__direct">
          <h2>${txt(t.contact.coordonnees)}</h2>
          <p>${txt(t.footer.email)}</p>
          <p>${txt(t.footer.telephone)}</p>
        </div>
      </div>
    </main>`,

    legal: () => `
    <main id="contenu" class="legal">
      <header class="page-head">
        <h1 class="page-head__title page-head__title--small">${txt(t.legal.titre)}</h1>
      </header>
      ${t.legal.blocs.map((b) => `<section class="legal__block"><h2>${txt(b.titre)}</h2>${b.lignes.map((l) => `<p>${txt(l)}</p>`).join('')}</section>`).join('')}
    </main>`,
  };

  const render = (page) => ({
    lang,
    title: raw(t.meta.pages[page].titre),
    description: raw(t.meta.pages[page].description || t.meta.description),
    nom: raw(nom),
    url: esc(content.url) + PAGES[page],
    body: header(page) + pages[page]() + footer(),
  });

  return { render };
}
