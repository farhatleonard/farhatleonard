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

### Le plus simple : l'espace d'administration

Allez sur **`https://<adresse-du-site>/admin/`** et connectez-vous avec GitHub.
Vous y trouvez un formulaire pour chaque page : textes, cocktails (nom, ingrédients, garniture, verre, couleurs), équipe (avec photos), coordonnées, mentions légales.
Chaque enregistrement met le site en ligne à jour automatiquement en 1 à 2 minutes.

Mise en place (une seule fois) :
1. Sur GitHub : *Settings → Developer settings → OAuth Apps → New OAuth App*.
   - *Homepage URL* : l'adresse du site Netlify
   - *Authorization callback URL* : `https://api.netlify.com/auth/done`
   - Notez le *Client ID* et générez un *Client secret*.
2. Sur Netlify : *Project configuration → Access & security → OAuth → Install provider* → GitHub, collez le Client ID et le secret.

### Directement dans les fichiers

Les contenus sont dans **`src/content/`** :

| Fichier | Contenu |
|---|---|
| `reglages.json` | **Nom de l'agence** (repris partout ; `{{NOM}}` dans un texte est remplacé par ce nom), adresse du site |
| `fr/general.json` | Menu, coordonnées, réseaux sociaux, mention santé |
| `fr/accueil.json` | Page d'accueil |
| `fr/carte.json` | Les cocktails : nom, ingrédients, garniture, verre (`coupe`, `flute`, `martini`, `tumbler`, `highball`), deux couleurs |
| `fr/agence.json` | Méthode, sur-mesure, exécution, clients, équipe |
| `fr/contact.json`, `fr/legal.json` | Contact, mentions légales |

Les éléments encore à fournir sont écrits entre crochets, par exemple `[À COMPLÉTER]`, et apparaissent soulignés en pointillés sur le site.

### En 3D, ce qui se règle depuis le contenu
- **Bulles** : automatiques si les ingrédients contiennent « champagne », « pétillant » ou « gazeuse ».
- **Garniture** : reconnue à partir du texte (zeste, feuille, fleur, thym, romarin…), couleur déduite (ex. « shiso rouge », « tagète orange »).
- **Couleurs du liquide** : couleur en surface et couleur au fond du verre.

## Modifier les couleurs, polices, tailles

Tout est dans **`src/styles/tokens.css`** (design tokens). Polices : **Boska** (titres) et **Switzer** (texte), de l'Indian Type Foundry via Fontshare, sous licence ITF Free Font License (usage commercial autorisé), auto-hébergées dans `src/fonts/`.

## Organisation

| Fichier | Rôle |
|---|---|
| `src/content/` | Tous les textes, la carte, l'équipe, les coordonnées |
| `src/templates/render.js` | Transforme le contenu en HTML (au moment de la construction) |
| `src/styles/` | Styles : `tokens.css` (valeurs), `base.css`, `layout.css` |
| `src/js/main.js` | Point d'entrée JavaScript |
| `src/js/three/glasses.js` | Formes des verres (coupe, flûte, martini, verre bas, verre haut) |
| `src/js/three/stage.js` | Scène 3D : le plateau, les verres, le liquide, les bulles, le nom derrière le verre |
| `src/js/three/garnish.js` | Garnitures en 3D |
| `public/admin/` | Espace d'administration (Decap CMS) |
| `src/js/pages/` | Comportement propre à chaque page (accueil, carte) |
| `index.html`, `carte/`, `agence/`, `contact/`, `mentions-legales/` | Les pages du site |
| `public/` | Fichiers copiés tels quels (favicon, robots.txt…) |

## Mise en ligne (Netlify)

Le site est relié à Netlify : **chaque modification envoyée sur GitHub (branche `main`) met le site en ligne à jour automatiquement**, en 1 à 2 minutes, à la même adresse.

La configuration est dans `netlify.toml` (commande de construction, dossier `dist`, en-têtes).

**Formulaire de contact** : il utilise Netlify Forms. Une fois le site en ligne, activez la détection des formulaires (*Project configuration → Forms → Enable form detection*), puis redéployez. Les demandes apparaissent dans l'onglet *Forms* de Netlify ; ajoutez-y une notification par e-mail vers votre adresse.

⚠️ **Avant le lancement officiel** : supprimer la ligne `X-Robots-Tag = "noindex"` dans `netlify.toml`, sinon Google n'indexera pas le site.

## Animations et 3D : choix techniques

Appliqués d'après les skills officiels GSAP (`greensock/gsap-skills`) et les skills Three.js
`CloudAI-X/threejs-skills` et `scottstts/Threejs-Awesome-Graphics-Agent-Skills` :

- **Défilement** : Lenis piloté par l'horloge de GSAP et synchronisé avec ScrollTrigger (ordinateur uniquement).
- **Effets au défilement** : transformations et opacité uniquement, « scrub » léger, désactivés si le visiteur demande moins d'animations.
- **Curseur et boutons magnétiques** : `gsap.quickTo`.
- **Verre** : réfraction réelle avec dispersion (franges colorées du cristal) sur le verre au premier plan ; verres éloignés simplifiés.
- **Éclairage** : studio photo virtuel (boîtes à lumière) pour des reflets nets.
- **Lueur sur les reflets** (bloom à seuil élevé) : ordinateur uniquement, coupée automatiquement si l'appareil peine ; le fond est compensé pour rester exactement au noir de la page.
- **Qualité adaptative** : la lueur puis la résolution baissent si l'image n'est pas fluide.

### Accueil : les séquences
1. **Manifeste** : la phrase de vision s'allume mot à mot au défilement.
2. **La carte en couleurs** : un panneau par création, dans ses deux couleurs (champ « couleur en surface » et « couleur au fond du verre ») ; section figée et défilement horizontal sur ordinateur, balayage au doigt sur mobile.
3. **La méthode** : cartes empilées comme des chemises de dossier ; l'onglet de chaque étape reste lisible.
4. **Bandeau** des occasions et des clients, accéléré par le défilement, sens inversé en remontant.
5. **Appel au contact** avec bouton rond magnétique.

**Transitions entre pages** : rideau dans la couleur d'une des créations (désactivé si le visiteur demande moins d'animations).
