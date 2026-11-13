// Fabrique le HTML de chaque page à partir des fichiers de src/content/, au moment de la construction.
// Ces fichiers se modifient depuis l'espace d'administration (/admin) ou directement.
// Le HTML final est statique : lisible sans JavaScript, bien référencé, compatible Netlify Forms.

const esc = (s = '') =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Les placeholders [À COMPLÉTER], [PHOTO À FOURNIR], [NOM À CHOISIR]… restent visibles à l'écran.
const TODO = /\[[^\]]*À (COMPLÉTER|FOURNIR|CHOISIR|VÉRIFIER)\]/g;

const GLASS_LABELS = { coupe: 'Coupe', flute: 'Flûte', martini: 'Verre à martini', tumbler: 'Verre bas', highball: 'Verre haut' };

export const PAGES = {
  accueil: '/',
  carte: '/carte/',
  agence: '/agence/',
  contact: '/contact/',
  legal: '/mentions-legales/',
  introuvable: '/404.html',
};

export function createRenderer({ reglages, pages: c }, { relative = false } = {}) {
  const g = c.general;
  const nom = reglages.nom;
  const withName = (s) => String(s ?? '').replaceAll('{{NOM}}', nom);
  const txt = (s) => esc(withName(s)).replace(TODO, (m) => `<mark class="todo">${m}</mark>`);
  const raw = (s) => esc(withName(s));
  const list = (items = []) => items.map((x, i) => txt(i ? x.charAt(0).toLowerCase() + x.slice(1) : x)).join(', ');

  // Lien vers une page. En production : /carte/. En aperçu (fichiers statiques) : chemins relatifs.
  let currentPage = 'accueil';
  const link = (target) => {
    if (!relative) return PAGES[target];
    const depth = currentPage === 'accueil' ? '' : '../';
    return target === 'accueil' ? `${depth}index.html` : `${depth}${PAGES[target].slice(1)}index.html`;
  };

  const wordmark = () => `<span class="wordmark">${txt(nom)}</span>`;

  const header = (page) => `
  <a class="skip-link" href="#contenu">Aller au contenu</a>
  ${['accueil', 'carte'].includes(page) ? `<div class="loader" data-loader aria-hidden="true"><span class="loader__name">${txt(nom)}</span><span class="loader__count" data-loader-count>00</span><span class="loader__line"><i data-loader-line></i></span></div>` : ''}
  <header class="site-header" data-header data-curtain="${esc(drinks().map((d) => d.couleurProfonde).join(','))}">
    <a class="site-header__brand" href="${link('accueil')}" ${page === 'accueil' ? 'aria-current="page"' : ''}>${wordmark()}</a>
    <nav class="site-header__nav" id="menu" aria-label="Navigation principale" data-menu>
      <ul>${['carte', 'agence', 'contact']
        .map((k, i) => `<li style="--i:${i}"><a href="${link(k)}" ${k === page ? 'aria-current="page"' : ''}>${txt(g.nav[k])}</a></li>`)
        .join('')}</ul>
      <p class="site-header__menu-meta">${txt(g.coordonnees.email)}</p>
    </nav>
    <div class="site-header__tools">
      <button class="sound-toggle" type="button" aria-pressed="false" data-sound-toggle hidden>
        <span class="sound-toggle__bars" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="sound-toggle__label">${txt(g.son.libelle || 'Son')}</span>
      </button>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="menu" data-menu-toggle hidden>
        <span data-menu-label>Menu</span>
      </button>
    </div>
  </header>`;

  const footer = () => `
  <footer class="site-footer">
    <div class="site-footer__inner">
      <p class="site-footer__name">${wordmark()}</p>
      <address class="site-footer__contact">
        <span>${txt(g.coordonnees.email)}</span>
        <span>${txt(g.coordonnees.telephone)}</span>
        <span>${txt(g.coordonnees.adresse)}</span>
      </address>
      <ul class="site-footer__links">
        ${(g.reseaux || []).map((r) => `<li>${r.url && !r.url.startsWith('[') ? `<a href="${esc(r.url)}" rel="noopener">${txt(r.label)}</a>` : `${txt(r.label)} ${txt(r.url)}`}</li>`).join('')}
        <li><a href="${link('legal')}">${txt(g.lienLegal)}</a></li>
      </ul>
      <p class="site-footer__health">${txt(g.mentionSante)}</p>
    </div>
  </footer>`;

  // ---------- La carte : toutes les créations, dans l'ordre ----------
  const drinks = () => [
    ...(c.carte.cocktails || []).map((d) => ({ ...d, group: 'cocktails' })),
    ...(c.carte.sansAlcool || []).map((d) => ({ ...d, group: 'sans-alcool' })),
  ];
  const sparkling = (d) => /champagne|pétillant|gazeuse|tonic|soda|bulles/i.test(d.description || '');
  // Données lues par la scène 3D
  const drinkData = (d) =>
    `data-drink data-name="${raw(d.nom)}" data-sub="${raw(d.sousTitre)}" data-glass="${esc(d.verre)}" data-c1="${esc(d.couleurClaire)}" data-c2="${esc(d.couleurProfonde)}" data-garnish="${raw(d.garniture)}" data-sparkling="${sparkling(d)}"`;

  const drinkItem = (d, i) => `
    <li class="drink" id="creation-${i + 1}" style="--c1:${esc(d.couleurClaire)}" ${drinkData(d)} data-group="${d.group}">
      <h3 class="drink__name">${txt(d.nom)}</h3>
      <p class="drink__sub">${txt(d.sousTitre)}</p>
      <p class="drink__desc">${txt(d.description)}</p>
      <dl class="drink__meta">
        <div><dt>${txt(c.carte.libelleGarniture)}</dt><dd>${txt(d.garniture)}</dd></div>
        <div><dt>${txt(c.carte.libelleVerre)}</dt><dd>${esc(GLASS_LABELS[d.verre] || d.verre)}</dd></div>
      </dl>
    </li>`;

  // ---------- Pages ----------
  const pages = {
    accueil: () => {
      const a = c.accueil;
      const first = drinks()[0] || {};
      return `
    <main id="contenu" class="home">
      <section class="home-hero" aria-labelledby="home-titre">
        <div class="stage" data-stage="home" aria-hidden="true"></div>
        <div class="home-hero__text">
          <p class="home-hero__kicker">${txt(a.descripteur)}</p>
          <h1 id="home-titre" class="home-hero__title">${txt(a.phrase)}</h1>
          <a class="link-cta" href="${link('carte')}">${txt(a.boutonCarte)}</a>
        </div>
        <p class="home-hero__now" aria-live="polite">
          <span class="home-hero__now-label">${txt(a.enCeMoment)}</span>
          <span class="home-hero__now-name" data-now-name>${txt(first.nom)}</span>
          <span class="home-hero__now-sub" data-now-sub>${txt(first.sousTitre)}</span>
        </p>
        <ul hidden>${drinks().map((d) => `<li ${drinkData(d)}></li>`).join('')}</ul>
      </section>

      <!-- Manifeste : la phrase s'allume mot à mot au défilement -->
      <section class="manifesto" aria-labelledby="vision-titre">
        <h2 id="vision-titre" class="manifesto__title" data-words>${String(a.visionTitre)
          .split(' ')
          .map((w) => `<span class="w">${txt(w)}</span>`)
          .join(' ')}</h2>
        <div class="manifesto__aside">
          <p>${txt(a.visionTexte)}</p>
          <a class="link-cta" href="${link('agence')}">${txt(a.boutonAgence)}</a>
        </div>
      </section>

      <!-- La carte en couleurs : un panneau par création, défilement horizontal -->
      <section class="spectrum" aria-labelledby="spectrum-titre" data-spectrum>
        <div class="spectrum__pin">
          <header class="spectrum__head">
            <h2 id="spectrum-titre">${txt(c.carte.titre)}</h2>
            <p>${txt(c.carte.intro)}</p>
          </header>
          <ul class="spectrum__track" data-spectrum-track>
            ${drinks()
              .map(
                (d) => `
            <li class="panel" style="--c1:${esc(d.couleurClaire)};--c2:${esc(d.couleurProfonde)}">
              <article class="panel__inner">
                <p class="panel__kind">${txt(d.group === 'cocktails' ? c.carte.titreCocktails : c.carte.titreSansAlcool)}</p>
                <h3 class="panel__name" data-panel-name>${txt(d.nom)}</h3>
                <p class="panel__sub">${txt(d.sousTitre)}</p>
                <p class="panel__desc">${txt(d.description)}</p>
                <p class="panel__garnish">${txt(c.carte.libelleGarniture)} : ${txt(d.garniture)}</p>
              </article>
            </li>`,
              )
              .join('')}
            <li class="panel panel--end">
              <a class="panel__link" href="${link('carte')}">${txt(a.boutonCarte)}</a>
            </li>
          </ul>
        </div>
      </section>

      <!-- La méthode : des cartes qui s'empilent -->
      <section class="stack" aria-labelledby="stack-titre">
        <h2 id="stack-titre" class="stack__title">${txt(c.agence.methodeTitre)}</h2>
        <ol class="stack__list">
          ${(c.agence.etapes || [])
            .map(
              (e, i) => `
          <li class="stack__card" style="--i:${i}" data-stack-card>
            <p class="stack__tab" aria-hidden="true"><span>${String(i + 1).padStart(2, '0')}</span><span>${txt(e.titre)}</span></p>
            <span class="stack__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
            <h3 class="stack__name"><span class="visually-hidden">${String(i + 1).padStart(2, '0')}. </span>${txt(e.titre)}</h3>
            <p class="stack__text">${txt(e.texte)}</p>
          </li>`,
            )
            .join('')}
        </ol>
      </section>

      <!-- Occasions : bandeau continu, lié à la vitesse de défilement -->
      <section class="ribbon" aria-label="${raw(c.agence.pourQuiTitre)}">
        <p class="visually-hidden">${list(c.agence.occasions)}. ${list(c.agence.clients)}.</p>
        <div class="ribbon__row" aria-hidden="true" data-ribbon="1">
          ${[0, 1].map(() => `<span class="ribbon__set">${(c.agence.occasions || []).map((o) => `<span>${txt(o)}</span><i></i>`).join('')}</span>`).join('')}
        </div>
        <div class="ribbon__row ribbon__row--soft" aria-hidden="true" data-ribbon="-1">
          ${[0, 1].map(() => `<span class="ribbon__set">${(c.agence.clients || []).map((o) => `<span>${txt(o)}</span><i></i>`).join('')}</span>`).join('')}
        </div>
      </section>

      <!-- Appel au contact -->
      <section class="cta" aria-labelledby="cta-titre">
        <h2 id="cta-titre" class="cta__title">${txt(c.contact.titre)}</h2>
        <a class="cta__button" href="${link('contact')}"><span>${txt(a.boutonContact || 'Nous écrire')}</span></a>
      </section>
    </main>`;
    },

    carte: () => {
      const k = c.carte;
      const all = drinks();
      const nCocktails = (k.cocktails || []).length;
      return `
    <main id="contenu" class="carte">
     <div class="carte__track">
     <div class="carte__sticky">
      <div class="stage stage--carte" data-stage="carte" aria-hidden="true"></div>
      <div class="carte__head">
        <h1 class="carte__title">${txt(k.titre)}</h1>
        <p class="carte__intro">${txt(k.intro)}</p>
        <p class="carte__help" data-js-only hidden>${txt(k.aide)}</p>
      </div>
      <div class="carte__groups">
        <section aria-labelledby="g-cocktails">
          <h2 id="g-cocktails" class="carte__group">${txt(k.titreCocktails)}</h2>
          <ol class="drinks">${all.slice(0, nCocktails).map(drinkItem).join('')}</ol>
        </section>
        <section aria-labelledby="g-sans-alcool">
          <h2 id="g-sans-alcool" class="carte__group">${txt(k.titreSansAlcool)}</h2>
          <ol class="drinks">${all.slice(nCocktails).map((d, i) => drinkItem(d, i + nCocktails)).join('')}</ol>
        </section>
      </div>
      <nav class="carte__nav" aria-label="Choisir une création" data-js-only hidden>
        <button type="button" class="carte__arrow" data-prev aria-label="Création précédente">‹</button>
        <ol>${all
          .map((d, i) => `<li><button type="button" data-goto="${i}" class="carte__dot ${i === nCocktails ? 'is-first-na' : ''}">${txt(d.nom)}</button></li>`)
          .join('')}</ol>
        <button type="button" class="carte__arrow" data-next aria-label="Création suivante">›</button>
      </nav>
      <p class="carte__health">${txt(k.mentionSante)}</p>
     </div>
     </div>
    </main>`;
    },

    agence: () => {
      const a = c.agence;
      const pairs = (items, cls) =>
        `<div class="pairs ${cls}">${(items || []).map((p) => `<div class="pair"><h3>${txt(p.titre)}</h3><p>${txt(p.texte)}</p></div>`).join('')}</div>`;
      return `
    <main id="contenu" class="agence">
      <header class="page-head">
        <h1 class="page-head__title">${txt(a.titre)}</h1>
        <p class="page-head__lead">${txt(a.chapeau)}</p>
      </header>

      <section class="block" aria-labelledby="methode-titre">
        <h2 id="methode-titre" class="block__title">${txt(a.methodeTitre)}</h2>
        <ol class="steps">
          ${(a.etapes || []).map((e, i) => `
          <li class="step">
            <span class="step__num">${String(i + 1).padStart(2, '0')}</span>
            <h3 class="step__title">${txt(e.titre)}</h3>
            <p class="step__text">${txt(e.texte)}</p>
          </li>`).join('')}
        </ol>
      </section>

      <section class="block" aria-labelledby="sur-mesure-titre">
        <h2 id="sur-mesure-titre" class="block__title">${txt(a.surMesureTitre)}</h2>
        ${pairs(a.surMesurePoints, 'pairs--3')}
      </section>

      <section class="block" aria-labelledby="execution-titre">
        <h2 id="execution-titre" class="block__title">${txt(a.executionTitre)}</h2>
        ${pairs(a.executionPoints, 'pairs--2')}
      </section>

      <section class="block" aria-labelledby="pour-qui-titre">
        <h2 id="pour-qui-titre" class="block__title">${txt(a.pourQuiTitre)}</h2>
        <div class="audience">
          <p class="audience__line">${list(a.clients)}.</p>
          <p class="audience__line audience__line--soft">${list(a.occasions)}.</p>
        </div>
      </section>

      <section class="block" aria-labelledby="equipe-titre">
        <h2 id="equipe-titre" class="block__title">${txt(a.equipeTitre)}</h2>
        <ul class="team">
          ${(a.equipe || []).map((m) => `
          <li class="member">
            <div class="member__photo">${
              m.photo
                ? `<img src="${esc(m.photo)}" alt="${raw(m.prenom)}" loading="lazy" width="800" height="1000">`
                : `<span aria-hidden="true">${txt((m.prenom || '?').charAt(0))}</span>`
            }</div>
            <h3 class="member__name">${txt(m.prenom)}</h3>
            <p class="member__role">${txt(m.role)}. ${txt(m.detail)}</p>
            ${m.bio ? `<p class="member__bio">${txt(m.bio)}</p>` : ''}
            ${m.photo ? '' : `<p class="member__todo"><mark class="todo">[PHOTO À FOURNIR]</mark></p>`}
          </li>`).join('')}
        </ul>
      </section>

      <section class="block block--end">
        <a class="link-cta" href="${link('contact')}">${txt(a.lienContact)}</a>
      </section>
    </main>`;
    },

    contact: () => {
      const k = c.contact;
      const f = k.formulaire;
      const field = (name, label, { type = 'text', required = false, autocomplete = '', inputmode = '' } = {}) => `
          <div class="field">
            <input class="field__input" id="f-${name}" name="${name}" type="${type}" placeholder=" " ${required ? 'required aria-required="true"' : ''}
              ${autocomplete ? `autocomplete="${autocomplete}"` : ''} ${inputmode ? `inputmode="${inputmode}"` : ''} aria-describedby="e-${name}">
            <label class="field__label" for="f-${name}">${txt(label)}${required ? '' : ` <span class="field__opt">${txt(f.facultatif)}</span>`}</label>
            <p class="field__error" id="e-${name}"></p>
          </div>`;
      const select = (name, label, options, required) => `
          <div class="field field--select">
            <select class="field__input" id="f-${name}" name="${name}" ${required ? 'required aria-required="true"' : ''} aria-describedby="e-${name}">
              <option value="" selected></option>
              ${options.map((o) => `<option>${txt(o)}</option>`).join('')}
            </select>
            <label class="field__label" for="f-${name}">${txt(label)}${required ? '' : ` <span class="field__opt">${txt(f.facultatif)}</span>`}</label>
            <p class="field__error" id="e-${name}"></p>
          </div>`;
      return `
    <main id="contenu" class="contact">
      <header class="page-head">
        <h1 class="page-head__title">${txt(k.titre)}</h1>
        <p class="page-head__lead">${txt(k.intro)}</p>
      </header>
      <div class="contact__grid">
        <form class="form" name="contact" method="POST" action="/contact/?envoye=1" data-netlify="true" netlify-honeypot="site-web" novalidate data-form>
          <input type="hidden" name="form-name" value="contact">
          <p class="form__hp" aria-hidden="true"><label>Ne pas remplir <input name="site-web" tabindex="-1" autocomplete="off"></label></p>
          <div class="form__row">
            ${field('nom', f.nom, { required: true, autocomplete: 'name' })}
            ${field('societe', f.societe, { autocomplete: 'organization' })}
          </div>
          <div class="form__row">
            ${field('email', f.email, { type: 'email', required: true, autocomplete: 'email' })}
            ${field('telephone', f.telephone, { type: 'tel', autocomplete: 'tel', inputmode: 'tel' })}
          </div>
          <div class="form__row form__row--3">
            ${select('evenement', f.evenement, f.typesEvenement || [], true)}
            ${field('date', f.date, { type: 'text', autocomplete: 'off' })}
            ${select('invites', f.invites, f.fourchettesInvites || [], false)}
          </div>
          <div class="field field--area">
            <textarea class="field__input" id="f-message" name="message" rows="5" placeholder=" " required aria-required="true" aria-describedby="e-message"></textarea>
            <label class="field__label" for="f-message">${txt(f.message)}</label>
            <p class="field__error" id="e-message"></p>
          </div>
          <div class="consent">
            <input type="checkbox" id="f-consent" name="consentement" value="oui" required aria-required="true" aria-describedby="e-consent">
            <label for="f-consent">${txt(f.consentement)} <a href="${link('legal')}">${txt(f.lienConfidentialite)}</a></label>
            <p class="field__error" id="e-consent"></p>
          </div>
          <div class="form__submit">
            <button class="button" type="submit" data-submit><span>${txt(k.boutonEnvoyer)}</span></button>
            <p class="form__status" role="status" aria-live="polite" data-status></p>
          </div>
          <div class="form__done" data-done hidden tabindex="-1">
            <p class="form__done-title">${txt(f.merciTitre)}</p>
            <p>${txt(f.merciTexte)}</p>
          </div>
          <template data-messages>${esc(JSON.stringify(f.erreurs || {}))}</template>
        </form>
        <aside class="contact__direct">
          <h2>${txt(k.coordonneesTitre)}</h2>
          <p>${txt(g.coordonnees.email)}</p>
          <p>${txt(g.coordonnees.telephone)}</p>
          <p>${txt(g.coordonnees.adresse)}</p>
        </aside>
      </div>
    </main>`;
    },

    introuvable: () => {
      const k = g.introuvable;
      return `
    <main id="contenu" class="notfound">
      <h1 class="notfound__title">${txt(k.titre)}</h1>
      <p class="notfound__text">${txt(k.texte)}</p>
      <p class="notfound__links"><a class="link-cta" href="${link('accueil')}">${txt(k.lienAccueil)}</a><a class="link-cta" href="${link('carte')}">${txt(k.lienCarte)}</a></p>
    </main>`;
    },

    legal: () => {
      const k = c.legal;
      return `
    <main id="contenu" class="legal">
      <header class="page-head">
        <h1 class="page-head__title page-head__title--small">${txt(k.titre)}</h1>
      </header>
      ${(k.blocs || []).map((b) => `<section class="legal__block"><h2>${txt(b.titre)}</h2>${(b.lignes || []).map((l) => `<p>${txt(l)}</p>`).join('')}</section>`).join('')}
    </main>`;
    },
  };

  const render = (page) => {
    currentPage = page;
    const p = page === 'introuvable' ? { titrePage: g.introuvable.titrePage } : c[page];
    return {
      lang: reglages.langue || 'fr',
      title: raw(p.titrePage),
      description: raw(p.descriptionPage || g.descriptionParDefaut),
      nom: raw(nom),
      url: esc(reglages.url) + PAGES[page],
      root: esc(reglages.url),
      body: header(page) + pages[page]() + footer(),
    };
  };

  return { render };
}
