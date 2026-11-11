# Site vitrine — bar événementiel haut de gamme (Paris)

Site statique construit avec Vite. Contenu centralisé, animations GSAP / Lenis (à partir de l'étape 3).

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
- Les éléments encore à fournir sont écrits entre crochets, par exemple `[À COMPLÉTER]`, et apparaissent encadrés en pointillés sur le site.

## Modifier les couleurs, polices, tailles

Tout est dans **`src/styles/tokens.css`** (design tokens).

## Organisation

| Fichier | Rôle |
|---|---|
| `src/content/site.json` | Tous les textes, la carte, l'équipe, les coordonnées |
| `src/templates/render.js` | Transforme le contenu en HTML (au moment de la construction) |
| `src/styles/` | Styles : `tokens.css` (valeurs), `base.css`, `layout.css` |
| `src/js/main.js` | Point d'entrée JavaScript (animations à venir) |
| `public/` | Fichiers copiés tels quels (favicon, robots.txt…) |

## Déploiement

Instructions Netlify : à venir (étape 6).
