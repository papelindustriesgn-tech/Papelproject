# Site officiel Papel Industries

> **Papel — L'hygiène au quotidien.**
> Site vitrine + catalogue administrable + génération de prospects B2B, conçu d'abord pour le mobile.

Ce dossier est une application **autonome** (son propre `package.json`, sa propre base Supabase).
Il cohabite dans le dépôt avec l'application Uny (racine du dépôt), sans la modifier :
seules deux lignes ont été ajoutées à la racine pour que l'outillage d'Uny ignore `papel-site/`
(`tsconfig.json` → `exclude`, `eslint.config.mjs` → `globalIgnores`).

## Pages

| Page | URL | Contenu |
| --- | --- | --- |
| Accueil | `/` | Hero (visuel desktop portrait + visuel mobile paysage), engagements, produits, « Papel dans votre quotidien », partenaires, entreprise, actualités, appel à l'action |
| Nos produits | `/produits`, `/produits/[slug]` | Catalogue par gamme ; fiche avec galerie, caractéristiques (« En cours de validation » si non renseignées), usages, devis / distributeur / WhatsApp |
| Papel Industries | `/entreprise` | Histoire, ambition industrielle, Coyah (rendus d'architecte légendés), vision, engagements |
| Professionnels | `/professionnels` | Distributeurs, CHR & entreprises, revendeurs + formulaire professionnel |
| Actualités | `/actualites`, `/actualites/[slug]` | Articles, partage WhatsApp / Facebook / lien |
| Contact | `/contact` | Moyens de contact configurés, site de Coyah, formulaire, WhatsApp, réseaux, carte (si GPS renseigné) |
| Légal | `/mentions-legales`, `/confidentialite` | |
| Administration | `/admin` | Voir plus bas |

## Stack

Next.js 16 (App Router, Server Actions, Proxy) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage, RLS) · React Hook Form + Zod · Playwright · Vercel.

- Pages publiques **statiques régénérées** (ISR, 5 min) + invalidation immédiate après chaque modification dans l'admin.
- Le **proxy** ne s'exécute que sur `/admin` : aucun coût sur le site public.
- Sans variables Supabase, le site public fonctionne avec le **contenu par défaut** (`src/content/defaults.ts`), utile pour une préversion ; les formulaires répondent alors « service indisponible ».

## Démarrage local

Prérequis : Node ≥ 20.9, Docker.

```bash
cd papel-site
npm install
npm run db:start                 # Supabase local ; affiche les clés
cp .env.example .env.local       # coller URL, ANON_KEY, SERVICE_ROLE_KEY ; ajouter NEXT_IMAGE_ALLOW_LOCAL_IP=1
npm run admin:create -- admin@papel.local "MotDePasseSolide2026!" "Prénom Nom"
npm run dev                      # http://localhost:3000 — admin : http://localhost:3000/admin
```

`npm run db:reset` rejoue les migrations (schéma + contenu initial) sur la base locale.

## Variables d'environnement

| Variable | Où | Rôle |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | URL du projet Supabase **dédié à Papel** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Clé publique (lecture des contenus publiés uniquement, grâce à RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **serveur uniquement** | Enregistrement des formulaires et des clics. Jamais préfixée `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | public | Domaine canonique (sitemap, Open Graph, données structurées) |
| `FORM_IP_SALT` | serveur | Sel de l'empreinte IP anti-spam (valeur aléatoire longue) |
| `FORM_RATE_LIMIT_MAX` | serveur, facultatif | Envois max par formulaire / IP / 30 min (défaut 5) |

## Base de données

Migrations dans `supabase/migrations/` :

1. `20261106000001_papel_schema.sql` — tables, types, RLS, bucket `media`.
2. `20261106000002_initial_content.sql` — réglages, gammes, produits, actualité initiale (rejouable, n'écrase rien).

| Table | Public (anon) | Admin |
| --- | --- | --- |
| `site_settings` | lecture | lecture / écriture |
| `product_ranges`, `products`, `news_posts` | lecture **des contenus publiés** (un produit exige aussi sa gamme publiée ; une actualité exige une date passée) | tout |
| `leads`, `contact_messages`, `conversion_events` | **aucun accès** (ni lecture ni écriture) | lecture / mise à jour |
| `admin_users` | aucun accès | lecture |
| Storage `media` | lecture | dépôt / suppression |

Les formulaires publics passent par des Server Actions : validation Zod, champ leurre, délai minimal, limitation par empreinte IP, puis insertion côté serveur.
Les inscriptions publiques sont **désactivées** (`supabase/config.toml`) ; les comptes admin se créent avec `npm run admin:create`.

Vérifié en local : un visiteur ou un compte connecté non administrateur ne peut ni lire les prospects, ni modifier un produit, ni se promouvoir administrateur, ni déposer un fichier.

## Administration (`/admin`)

| Rubrique | Ce qu'on y fait |
| --- | --- |
| Tableau de bord | Demandes sur 7 / 30 jours, taux de conversion, clics WhatsApp et boutons d'action, messages à traiter, pipeline par statut, dernières demandes |
| Prospects | Recherche (nom, entreprise, ville, téléphone, e-mail), filtres (statut, activité, type de demande), pagination, fiche détaillée avec lien WhatsApp, statut **Nouveau → À contacter → En discussion → Converti → Clôturé**, notes internes, **export CSV** (compatible Excel, filtres appliqués) |
| Messages | Messages du formulaire de contact : Nouveau / Traité / Archivé |
| Produits | Créer, modifier, archiver, supprimer ; photos (dépôt ou chemin), caractéristiques, usages, disponibilité, mise en avant, SEO ; statuts **Brouillon / Publié / Archivé** |
| Gammes | Gammes futures en brouillon ; case « commercialisée » à ne cocher qu'une fois les produits en vente |
| Actualités | Éditeur texte simple (`##` intertitre, `-` liste, `**gras**`, `[lien](https://…)`), couverture, catégorie, date (programmable), SEO |
| Page d'accueil | Textes et visuels du hero, des engagements, de la section entreprise et de l'appel final |
| Entreprise | WhatsApp, téléphone, e-mail, horaires, réseaux sociaux, site industriel (+ GPS pour la carte), mentions légales |

Un champ de contact vide n'est **jamais** affiché : les boutons WhatsApp apparaissent automatiquement dès que le numéro officiel est saisi. Les messages préremplis dépendent du contexte (information, devis avec nom du produit, devenir distributeur).

## Tests

```bash
npm run lint && npm run typecheck && npm test   # unitaires (validation, WhatsApp, CSV, slug, anti-robots)
npm run build && npm start -- -p 3100           # avec la base locale démarrée
npm run admin:create -- admin@papel.local "AdminPapel2026!"
# + un compte non-admin lambda@papel.local / LambdaUser2026! (via le Studio ou l'API admin)
FORM_RATE_LIMIT_MAX=1000 npm run test:e2e       # ajouter PW_CHROMIUM_PATH=… si Chromium est préinstallé ailleurs
```

Les tests de bout en bout couvrent : 10 pages publiques × 5 largeurs (360 → 1536 px) sans défilement horizontal ni erreur console, gammes non commercialisées masquées, brouillons introuvables, menu mobile, SEO (sitemap, robots, canonical, Open Graph, JSON-LD), 404, formulaires professionnel et contact (erreurs puis succès), protection de l'admin (sans session, mauvais mot de passe, compte non admin), suivi d'un prospect et export CSV (avec neutralisation des formules), WhatsApp contextuel, modification d'un produit visible sur le site, publication d'une actualité.

## Déploiement Vercel (non effectué — à lancer après validation)

1. Créer un **projet Supabase dédié** (ne pas réutiliser celui d'Uny), puis appliquer les migrations : `npx supabase link --project-ref <ref>` puis `npx supabase db push`.
2. Dans Supabase › Authentication : désactiver « Allow new users to sign up », garder le fournisseur e-mail actif ; renseigner l'URL du site.
3. Créer le premier administrateur : `npm run admin:create -- …` avec les variables de production dans `.env.local` (le temps de la commande).
4. Vercel › nouveau projet sur ce dépôt, **Root Directory = `papel-site`**, framework Next.js, variables ci-dessus.
5. Brancher le domaine, mettre `NEXT_PUBLIC_SITE_URL` à jour, vérifier `/sitemap.xml` et le déclarer dans Google Search Console.

Les préversions Vercel renvoient un `robots.txt` « Disallow: / ».

## Évolutions prévues par l'architecture

- **Anglais** : les textes publics sont centralisés (pages, `src/content/defaults.ts`, `site_settings`) ; l'ajout d'un segment `[lang]` et de colonnes traduites ne remet pas en cause le schéma.
- **Nouvelles gammes** (papier toilette, essuie-tout, serviettes, autres) : déjà créées en brouillon ; il suffit d'ajouter les produits puis de publier la gamme.
- **Points de vente** : la page Contact contient l'ancre `#distributeur` prête à accueillir une liste de distributeurs.
