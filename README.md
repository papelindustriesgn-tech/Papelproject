# Papel — site officiel

Site de la marque **Papel** (Papel Industries, groupe CIG, Coyah, Guinée).
*La qualité au quotidien.*

Site statique, bilingue (français par défaut, anglais sous `/en/`), pensé pour les
smartphones Android en 3G/4G : ~145 Ko au premier affichage de l'accueil, images
WebP en chargement différé, polices hébergées sur le site, aucune dépendance à installer.

## Démarrer

```bash
npm run build   # génère le site dans dist/
npm run dev     # génère puis prévisualise sur http://localhost:8080
```

Node 18 ou plus récent suffit : il n'y a rien à installer (`npm install` inutile).

## Modifier les textes et les réglages

| Quoi | Où |
|---|---|
| Tous les textes en français | `content/fr.json` |
| Tous les textes en anglais | `content/en.json` |
| WhatsApp, téléphone, e-mail, adresse, réseaux sociaux, prix public, formulaires, mesure d'audience | `content/config.json` |
| Points de vente (page « Où acheter ») | `content/points-de-vente.json` |

On modifie uniquement le texte entre guillemets à droite des deux-points, puis on
relance `npm run build`. Sur Vercel ou Netlify, la reconstruction se fait
automatiquement à chaque modification poussée sur GitHub.

### À compléter avant la mise en ligne

La commande `npm run build` liste ce qu'il reste à remplir. Voici le détail :

- `content/config.json` : `whatsapp` (format international sans « + » ni espaces,
  par ex. `224622123456`), `whatsappDisplay`, `phone`, `phoneDisplay`, `email`,
  `address.street`, les coordonnées GPS de l'usine, `siteUrl` (le vrai domaine).
- **Logo** : le logo actuel est un dessin provisoire. Remplacez le contenu de la
  fonction `logo()` dans `build/icons.mjs` par le SVG officiel.
- **Photo de la boîte distributrice** : déposez `boite-600.webp` et
  `boite-1000.webp` dans `src/assets/img/`, puis mettez `"image": "boite"` sur le
  produit `boite` dans `fr.json` et `en.json`. En attendant, une illustration
  s'affiche avec la mention « Photo à venir ».
- **Photos de l'usine** : pour l'instant ce sont les vues d'architecte. Pour les
  remplacer, gardez les mêmes noms de fichiers (`usine-facade-800.webp`,
  `usine-facade-1400.webp`, etc.).
- **Mentions légales** : RCCM, NIF, hébergeur, directeur de la publication
  (`legal` dans `fr.json` / `en.json`).

### Ajouter une image

Chaque image existe en 2 largeurs, au format WebP (qualité 70–75) :
`nom-800.webp` et `nom-1400.webp`, par exemple. Le site choisit automatiquement
la bonne taille selon l'écran. Visez moins de 60 Ko par image mobile.

## Formulaires (distributeur, contact, alerte « Où acheter »)

Les formulaires envoient une requête `POST` en JSON à l'adresse `formEndpoint`
définie dans `content/config.json`.

- **Recevoir par e-mail** (le plus simple) : créez un formulaire sur
  [Formspree](https://formspree.io) ou [Web3Forms](https://web3forms.com), associez-le
  à l'adresse e-mail de l'équipe commerciale, puis collez l'URL fournie dans
  `formEndpoint`.
- **Plus tard, Odoo CRM** : chaque envoi contient un bloc `odoo` dont les champs
  correspondent déjà au modèle `crm.lead` (`name`, `contact_name`, `partner_name`,
  `phone`, `email_from`, `city`, `description`). Il suffit de faire pointer
  `formEndpoint` vers un contrôleur Odoo, ou vers un scénario Make ou n8n qui crée
  la piste et envoie l'e-mail.
- **Sans `formEndpoint`**, ou si le réseau coupe, le formulaire propose d'envoyer la
  demande **sur WhatsApp**, avec toutes les informations déjà remplies. Aucune
  demande n'est perdue.

Tous les formulaires ont une validation accessible et un champ piège anti-robots.
Le formulaire distributeur affiche un message de confirmation et un lien WhatsApp direct.

## Suivi des conversions

Pour activer la mesure, renseignez `ga4Id` (Google Analytics 4) et/ou
`metaPixelId` (Meta Pixel) dans `content/config.json`. Ces scripts se chargent
seulement une fois la page affichée, pour ne pas ralentir l'accueil.
Événements envoyés (aussi poussés dans `dataLayer` pour Google Tag Manager) :

| Événement | Déclencheur |
|---|---|
| `whatsapp_click` | Tout clic vers WhatsApp (paramètre `location` : `float`, `order-pochette`, `home-band`, …) |
| `generate_lead` | Envoi du formulaire distributeur (Meta : `Lead`) |
| `contact_form_submit` | Envoi du formulaire de contact |
| `notify_signup` | Inscription à l'alerte « Bientôt disponible » |
| `phone_click`, `email_click`, `social_click`, `map_open`, `directions` | Clics secondaires |

Dans GA4, déclarez `whatsapp_click` et `generate_lead` comme **événements clés**.

## Points de vente

`content/points-de-vente.json` contient une liste `points`. Tant qu'elle est vide,
la page « Où acheter » affiche « Bientôt disponible près de chez vous » avec le
formulaire d'alerte. Dès qu'un point est ajouté (voir le modèle dans
`points-de-vente.exemple.json`), la page affiche la recherche par quartier, les
filtres par ville et la carte. La carte (OpenStreetMap) ne se charge que si
l'utilisateur la demande, pour économiser ses données.

## SEO

- Balises title et description propres à chaque page, dans les deux langues,
  construites autour des requêtes « mouchoirs Guinée », « mouchoirs Conakry »,
  « grossiste mouchoirs Guinée » et « produits d'hygiène Guinée ».
- `canonical`, `hreflang` FR/EN, `sitemap.xml`, `robots.txt`.
- Open Graph et Twitter Card : vignette `assets/img/og-papel.jpg` (1200 × 630), pour
  un aperçu soigné dans WhatsApp et Facebook.
- Données structurées JSON-LD : `Organization` (accueil, contact) et `Product`
  (produits).

## Accessibilité

Contrastes AA, cibles tactiles d'au moins 44 px, lien d'évitement, navigation au
clavier, libellés de formulaire reliés aux messages d'erreur. Si l'utilisateur a
activé la réduction des animations (`prefers-reduced-motion`), les animations sont
désactivées.

## Structure

```
content/          textes FR/EN, réglages, points de vente (à éditer)
src/assets/css/   style.css (commenté ; minifié à la génération)
src/assets/js/    main.js (menu, animations, formulaires, suivi), locator.js (où acheter)
src/assets/img/   images WebP, vignette de partage, icônes
src/assets/fonts/ Poppins et Lora italique (woff2, sous-ensemble latin)
build/            générateur (build.mjs), icônes et logo (icons.mjs), serveur local
dist/             site généré (non versionné) → à publier
```

## Mise en ligne

**Vercel** (déjà configuré par `vercel.json`) : importez le dépôt ; la commande de
build et le dossier `dist` sont repris automatiquement.
**Autre hébergeur** : lancez `npm run build`, puis envoyez le contenu de `dist/`
à la racine du site. Configurez `404.html` comme page d'erreur.
