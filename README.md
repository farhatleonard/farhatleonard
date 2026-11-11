# Site vitrine — bar événementiel haut de gamme (Paris)

Site statique construit avec Vite, Three.js (3D) et GSAP. Contenu centralisé dans un seul fichier.

## Lancer le site sur son ordinateur

Prérequis : [Node.js](https://nodejs.org) version 20 ou plus.

```bash
npm install        # une seule fois
npm run dev        # ouvre le site en local, se met à jour à chaque modification
npm run build      # fabrique le site final dans le dossier dist/
```

## Modifier les contenus

Tout le texte du site est dans **`src/content/site.json`** :

- **Nom de l'agence** : ligne `"nom"` en haut du fichier. Il est repris partout (titre de la page, en-tête, pied de page…).
- Dans les textes, `{{NOM}}` est remplacé automatiquement par ce nom.
- **Changer le verre d'une création** : champ `"verre"` de chaque cocktail (`coupe`, `flute`, `martini`, `tumbler`, `highball`).
- Les éléments encore à fournir sont écrits entre crochets, par exemple `[À COMPLÉTER]`, et apparaissent encadrés en pointillés sur le site.

## Modifier les couleurs, polices, tailles

Tout est dans **`src/styles/tokens.css`** (design tokens). Polices : Bodoni Moda (titres) et Archivo (texte), auto-hébergées.

## Organisation

| Fichier | Rôle |
|---|---|
| `src/content/site.json` | Tous les textes, la carte, l'équipe, les coordonnées |
| `src/templates/render.js` | Transforme le contenu en HTML (au moment de la construction) |
| `src/styles/` | Styles : `tokens.css` (valeurs), `base.css`, `layout.css` |
| `src/js/main.js` | Point d'entrée JavaScript |
| `src/js/three/glasses.js` | Formes des verres (coupe, flûte, martini, verre bas, verre haut) |
| `src/js/three/stage.js` | Scène 3D : le verre, le liquide, la lumière, le nom derrière le verre |
| `src/js/pages/` | Comportement propre à chaque page (accueil, carte) |
| `index.html`, `carte/`, `agence/`, `contact/`, `mentions-legales/` | Les pages du site |
| `public/` | Fichiers copiés tels quels (favicon, robots.txt…) |

## Mise en ligne (Netlify)

Le site est relié à Netlify : **chaque modification envoyée sur GitHub (branche `main`) met le site en ligne à jour automatiquement**, en 1 à 2 minutes, à la même adresse.

La configuration est dans `netlify.toml` (commande de construction, dossier `dist`, en-têtes).

⚠️ **Avant le lancement officiel** : supprimer la ligne `X-Robots-Tag = "noindex"` dans `netlify.toml`, sinon Google n'indexera pas le site.
