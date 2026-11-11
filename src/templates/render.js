// Fabrique le HTML des pages à partir de src/content/site.json, au moment de la construction.
// Le HTML final est donc statique : lisible sans JavaScript, bien référencé, et compatible Netlify Forms.

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Les placeholders [À COMPLÉTER], [PHOTO À FOURNIR], [NOM À CHOISIR]… restent bien visibles à l'écran.
const TODO = /\[[^\]]*À (COMPLÉTER|FOURNIR|CHOISIR|VÉRIFIER)\]/g;

export function createRenderer(content, lang = content.langueParDefaut) {
  const t = content[lang];
  const nom = content.nom;
  const withName = (s) => String(s).replaceAll('{{NOM}}', nom);
  // txt : texte affiché (échappé, nom injecté, placeholders signalés)
  const txt = (s) => esc(withName(s)).replace(TODO, (m) => `<mark class="todo">${m}</mark>`);
  // raw : texte pour les attributs (title, meta…)
  const raw = (s) => esc(withName(s));

  const label = (s, extra = '') => `<p class="label ${extra}">${txt(s)}</p>`;

  const wordmark = (tag = 'span', cls = '') =>
    `<${tag} class="wordmark ${cls}" data-wordmark>${txt(nom)}</${tag}>`;

  const header = (home = true) => `
  <a class="skip-link" href="#contenu">Aller au contenu</a>
  <header class="site-header" data-header>
    <a class="site-header__brand" href="${home ? '#top' : '/'}" aria-label="${raw(nom)}, accueil">${wordmark()}</a>
    ${home ? `<nav class="site-header__nav" aria-label="Navigation principale">
      <ul>${t.nav.liens.map((l) => `<li><a href="#${l.ancre}">${txt(l.label)}</a></li>`).join('')}</ul>
    </nav>` : ''}
    <div class="site-header__actions">
      <button class="sound-toggle" type="button" aria-pressed="false" data-sound-toggle hidden>
        <span class="sound-toggle__bars" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="visually-hidden">${txt(t.nav.son.activer)}</span>
      </button>
      <a class="button button--small" href="${home ? '' : '/'}#contact">${txt(t.nav.cta)}</a>
    </div>
  </header>`;

  const footer = () => `
  <footer class="site-footer theme-dark">
    <div class="container site-footer__grid">
      <div>${wordmark('p', 'wordmark--footer')}</div>
      <address class="site-footer__contact">
        <span>${txt(t.footer.adresse)}</span>
        <span>${txt(t.footer.email)}</span>
        <span>${txt(t.footer.telephone)}</span>
      </address>
      <ul class="site-footer__links">
        ${t.footer.reseaux.map((r) => `<li>${txt(r.label)} : ${txt(r.url)}</li>`).join('')}
        ${t.footer.liensLegaux.map((l) => `<li><a href="${esc(l.url)}">${txt(l.label)}</a></li>`).join('')}
      </ul>
    </div>
    <div class="container site-footer__bottom">
      <p>${txt(t.footer.mentionSante)}</p>
      <p>${txt(t.footer.copyright)}</p>
    </div>
  </footer>`;

  // ---------- Sections de la page d'accueil ----------

  const section = (id, theme, inner, cls = '') =>
    `<section id="${id}" class="section section--${id} theme-${theme} ${cls}" aria-labelledby="${id}-titre">${inner}</section>`;

  const sections = {
    hero: () => `
    <section id="top" class="hero theme-dark" aria-label="Accueil">
      <div class="hero__bg" aria-hidden="true"></div>
      <div class="container hero__inner">
        ${label(t.hero.descripteur, 'hero__label')}
        <h1 class="hero__title">${wordmark('span', 'wordmark--hero')}</h1>
        <p class="hero__phrase">${txt(t.hero.phrase)}</p>
      </div>
      <a class="hero__scroll label" href="#vision">${txt(t.hero.defiler)}<span aria-hidden="true"></span></a>
    </section>`,

    vision: () =>
      section('vision', 'paper', `
      <div class="container">
        ${label(t.vision.libelle)}
        <h2 id="vision-titre" class="title-xl">${txt(t.vision.titre)}</h2>
        <p class="lead">${txt(t.vision.texte)}</p>
      </div>`),

    methode: () =>
      section('methode', 'dark', `
      <div class="container">
        ${label(t.methode.libelle)}
        <h2 id="methode-titre" class="title-l">${txt(t.methode.titre)}</h2>
        <ol class="steps">
          ${t.methode.etapes.map((e) => `
          <li class="step">
            <span class="step__num">${txt(e.numero)}</span>
            <h3 class="step__title">${txt(e.titre)}</h3>
            <p>${txt(e.texte)}</p>
          </li>`).join('')}
        </ol>
      </div>`),

    surMesure: () =>
      section('sur-mesure', 'paper', `
      <div class="container">
        ${label(t.surMesure.libelle)}
        <h2 id="sur-mesure-titre" class="title-l">${txt(t.surMesure.titre)}</h2>
        <ul class="points points--3">
          ${t.surMesure.points.map((p) => `<li class="point"><h3>${txt(p.titre)}</h3><p>${txt(p.texte)}</p></li>`).join('')}
        </ul>
      </div>`),

    carte: () => {
      const card = (c, i) => `
        <li class="drink" style="--c1:${esc(c.couleurs[0])};--c2:${esc(c.couleurs[1])}">
          <div class="drink__color" aria-hidden="true"></div>
          <span class="drink__num label">${String(i + 1).padStart(2, '0')}</span>
          <h4 class="drink__name">${txt(c.nom)}</h4>
          <p class="drink__sub">${txt(c.sousTitre)}</p>
          <p class="drink__desc">${txt(c.description)}</p>
          <p class="drink__garnish"><span class="label">${txt(t.carte.garnitureLabel)}</span> ${txt(c.garniture)}</p>
        </li>`;
      return section('carte', 'dark', `
      <div class="container">
        ${label(t.carte.libelle)}
        <h2 id="carte-titre" class="title-l">${txt(t.carte.titre)}</h2>
        <p class="lead">${txt(t.carte.intro)}</p>
        <div class="menu">
          <h3 class="menu__group label">${txt(t.carte.onglets.cocktails)}</h3>
          <ul class="drinks">${t.carte.cocktails.map(card).join('')}</ul>
          <h3 class="menu__group label">${txt(t.carte.onglets.sansAlcool)}</h3>
          <ul class="drinks">${t.carte.sansAlcool.map((c, i) => card(c, i + 4)).join('')}</ul>
        </div>
        <p class="health">${txt(t.carte.mentionSante)}</p>
      </div>`);
    },

    pourQui: () =>
      section('pour-qui', 'paper', `
      <div class="container">
        ${label(t.pourQui.libelle)}
        <h2 id="pour-qui-titre" class="title-l">${txt(t.pourQui.titre)}</h2>
        <div class="audience">
          <div>
            <h3 class="label">${txt(t.pourQui.clientsLabel)}</h3>
            <ul class="audience__clients">${t.pourQui.clients.map((c) => `<li>${txt(c)}</li>`).join('')}</ul>
          </div>
          <div>
            <h3 class="label">${txt(t.pourQui.occasionsLabel)}</h3>
            <ul class="audience__occasions">${t.pourQui.occasions.map((c) => `<li>${txt(c)}</li>`).join('')}</ul>
          </div>
        </div>
      </div>`),

    execution: () =>
      section('execution', 'dark', `
      <div class="container">
        ${label(t.execution.libelle)}
        <h2 id="execution-titre" class="title-l">${txt(t.execution.titre)}</h2>
        <ul class="points points--4">
          ${t.execution.points.map((p) => `<li class="point"><h3>${txt(p.titre)}</h3><p>${txt(p.texte)}</p></li>`).join('')}
        </ul>
      </div>`),

    equipe: () =>
      section('equipe', 'paper', `
      <div class="container">
        ${label(t.equipe.libelle)}
        <h2 id="equipe-titre" class="title-l">${txt(t.equipe.titre)}</h2>
        <ul class="team">
          ${t.equipe.membres.map((m) => `
          <li class="member">
            <div class="member__mono" aria-hidden="true">${txt(m.monogramme)}</div>
            <h3 class="member__name">${txt(m.prenom)}</h3>
            <p class="label">${txt(m.role)}</p>
            <p>${txt(m.detail)}</p>
            <p class="member__todo">${txt(m.bio)} · ${txt(m.photo)}</p>
          </li>`).join('')}
        </ul>
      </div>`),

    contact: () =>
      section('contact', 'gold', `
      <div class="container">
        ${label(t.contact.libelle)}
        <h2 id="contact-titre" class="title-xl">${txt(t.contact.titre)}</h2>
        <p class="lead">${txt(t.contact.intro)}</p>
        <p class="placeholder-block">Formulaire de contact : étape 5</p>
      </div>`),
  };

  const home = () =>
    header(true) +
    `<main id="contenu">` +
    ['hero', 'vision', 'methode', 'surMesure', 'carte', 'pourQui', 'execution', 'equipe', 'contact'].map((k) => sections[k]()).join('\n') +
    `</main>` +
    footer();

  const legal = () =>
    header(false) +
    `<main id="contenu" class="legal theme-paper">
      <div class="container container--narrow">
        <p><a href="/" class="label">← ${txt(t.legal.retour)}</a></p>
        <h1 class="title-l">${txt(t.legal.titre)}</h1>
        ${t.legal.blocs.map((b) => `<section><h2>${txt(b.titre)}</h2>${b.lignes.map((l) => `<p>${txt(l)}</p>`).join('')}</section>`).join('')}
      </div>
    </main>` +
    footer();

  return {
    lang,
    title: raw(t.meta.titre),
    legalTitle: raw(t.meta.titreLegal),
    description: raw(t.meta.description),
    nom: raw(nom),
    url: esc(content.url),
    home,
    legal,
  };
}
