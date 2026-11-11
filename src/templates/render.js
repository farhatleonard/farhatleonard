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
};

export function createRenderer({ reglages, pages: c }) {
  const g = c.general;
  const nom = reglages.nom;
  const withName = (s) => String(s ?? '').replaceAll('{{NOM}}', nom);
  const txt = (s) => esc(withName(s)).replace(TODO, (m) => `<mark class="todo">${m}</mark>`);
  const raw = (s) => esc(withName(s));
  const list = (items = []) => items.map((x, i) => txt(i ? x.charAt(0).toLowerCase() + x.slice(1) : x)).join(', ');

  const wordmark = () => `<span class="wordmark">${txt(nom)}</span>`;

  const header = (page) => `
  <a class="skip-link" href="#contenu">Aller au contenu</a>
  <header class="site-header">
    <a class="site-header__brand" href="/" ${page === 'accueil' ? 'aria-current="page"' : ''}>${wordmark()}</a>
    <nav class="site-header__nav" aria-label="Navigation principale">
      <ul>${['carte', 'agence', 'contact']
        .map((k) => `<li><a href="${PAGES[k]}" ${k === page ? 'aria-current="page"' : ''}>${txt(g.nav[k])}</a></li>`)
        .join('')}</ul>
    </nav>
    <button class="sound-toggle" type="button" aria-pressed="false" data-sound-toggle hidden>
      <span class="sound-toggle__wave" aria-hidden="true"></span>
      <span class="visually-hidden">${txt(g.son.activer)}</span>
    </button>
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
        <li><a href="${PAGES.legal}">${txt(g.lienLegal)}</a></li>
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
          <a class="link-cta" href="${PAGES.carte}">${txt(a.boutonCarte)}</a>
        </div>
        <p class="home-hero__now" aria-live="polite">
          <span class="home-hero__now-label">${txt(a.enCeMoment)}</span>
          <span class="home-hero__now-name" data-now-name>${txt(first.nom)}</span>
          <span class="home-hero__now-sub" data-now-sub>${txt(first.sousTitre)}</span>
        </p>
        <ul hidden>${drinks().map((d) => `<li ${drinkData(d)}></li>`).join('')}</ul>
      </section>
      <section class="home-intro" aria-labelledby="vision-titre">
        <h2 id="vision-titre" class="home-intro__title">${txt(a.visionTitre)}</h2>
        <p class="home-intro__text">${txt(a.visionTexte)}</p>
        <a class="link-cta" href="${PAGES.agence}">${txt(a.boutonAgence)}</a>
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
        <a class="link-cta" href="${PAGES.contact}">${txt(a.lienContact)}</a>
      </section>
    </main>`;
    },

    contact: () => {
      const k = c.contact;
      return `
    <main id="contenu" class="contact">
      <header class="page-head">
        <h1 class="page-head__title">${txt(k.titre)}</h1>
        <p class="page-head__lead">${txt(k.intro)}</p>
      </header>
      <div class="contact__grid">
        <p class="contact__form-placeholder">Le formulaire arrive à l'étape « Formulaire de contact ».</p>
        <div class="contact__direct">
          <h2>${txt(k.coordonneesTitre)}</h2>
          <p>${txt(g.coordonnees.email)}</p>
          <p>${txt(g.coordonnees.telephone)}</p>
        </div>
      </div>
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
    const p = c[page];
    return {
      lang: reglages.langue || 'fr',
      title: raw(p.titrePage),
      description: raw(p.descriptionPage || g.descriptionParDefaut),
      nom: raw(nom),
      url: esc(reglages.url) + PAGES[page],
      body: header(page) + pages[page]() + footer(),
    };
  };

  return { render };
}
