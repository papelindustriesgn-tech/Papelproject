# Uny — le passeport étudiant africain

> **Être étudiant a ses avantages.**
> Carte étudiante digitale, réductions, jobs & stages, logements et marketplace réunis dans une seule application web mobile-first (PWA).
> Disponible dans **toute la Guinée** (18 villes) — architecture multi-pays prête (GN, SN, CI, ML…).

## Fonctionnalités

| Module | Ce qui fonctionne |
| --- | --- |
| **Inscription / connexion** | Inscription en 2 étapes (< 3 min), confirmation par email, connexion par **email ou téléphone**, mot de passe oublié, changement d'email / mot de passe, déconnexion de tous les appareils |
| **Vérification étudiante** | Envoi d'un justificatif (photo ou PDF, stockage **privé**), 3 statuts (Non vérifié / Vérification en cours / Étudiant vérifié), validation ou refus motivé par l'admin, notification + email |
| **Uny Card** | Carte premium avec photo, établissement, filière, **Uny ID `GN-2026-000145`**, année universitaire, statut et **QR code** ; mode « Présenter » plein écran (horloge en direct anti-capture, écran maintenu allumé) ; page publique `/v/<jeton>` de vérification pour les partenaires |
| **Dashboard** | « Bonjour Prénom 👋 », aperçu de la carte, raccourcis, meilleures réductions, nouvelles offres, jobs, logements, nouveautés marketplace |
| **Avantages** | Catalogue partenaires, filtres par catégorie et par quartier, recherche, favoris, détail avec conditions et validité |
| **Jobs & opportunités** | 8 types (job, stage, alternance, freelance, bénévolat, concours, bourse, formation), recherche, favoris, **candidature intégrée** |
| **Logement** | Chambres, studios, colocations, appartements ; filtres budget / quartier / type / disponibilité ; galerie photos ; contact appel/WhatsApp |
| **Marketplace** | Publier avec photos (compressées sur le téléphone), modifier, masquer, marquer vendu, supprimer, « Mes annonces », contact vendeur |
| **Profil** | Photo, informations, statut, numéro Uny, paramètres de notifications, sécurité, déconnexion |
| **Espace partenaire** | Commerçants, bailleurs, entreprises : offres étudiantes, boutique (marketplace), logements, jobs avec candidatures, **scan du QR code de la carte** (caméra ou numéro) avec historique et statistiques. Demande en ligne `/partenaires`, validation par l'admin. Guide : [`docs/GUIDE-PARTENAIRES.md`](docs/GUIDE-PARTENAIRES.md) |
| **Toute la Guinée** | 18 villes ; chaque étudiant voit sa ville par défaut, ou « Toute la Guinée » |
| **Administration** | Vue d'ensemble (inscrits, vérifiés, inscriptions jour/semaine, actifs), vérifications, utilisateurs (rôle, statut), CRUD partenaires / avantages / jobs / logements, modération marketplace, statistiques (consultations, tops, établissements), suppression des données démo |
| **Applications mobiles** | Android (Google Play) et iOS (App Store) via Capacitor, suppression du compte dans l'app |
| **PWA** | Manifest, icônes, service worker (cache images/assets, carte consultable hors ligne), page hors ligne |

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions, Proxy) · **TypeScript** · **Tailwind CSS 4**
- **Supabase** : PostgreSQL, Auth, Storage, **Row Level Security** sur toutes les tables
- Emails : templates Supabase Auth + SMTP (Nodemailer) pour les emails applicatifs
- Tests : **Playwright** (E2E + 5 tailles d'écran) · script de **test de charge 1 000 utilisateurs synthétiques**
- Hébergement : **Vercel** + domaine personnalisé ; Vercel Analytics & Speed Insights

## Démarrage local

Pré-requis : Node ≥ 20.9, Docker.

```bash
npm install
cp .env.example .env.local        # puis coller les clés affichées par « db:start »
npm run db:start                  # Supabase local (Postgres, Auth, Storage, Mailpit)
npm run db:reset                  # schéma + RLS + données de référence + contenu de démo
npm run admin:local               # crée admin@uny.local / AdminUny2026
npm run dev                       # http://localhost:3000
```

Pour le développement local, ajoute `NEXT_IMAGE_ALLOW_LOCAL_IP=1` dans `.env.local`.
Les emails locaux (confirmation, mot de passe oublié…) arrivent dans **Mailpit** : http://127.0.0.1:54324.

## Tests

```bash
npm run build && npm start        # dans un terminal
npm run test:e2e                  # parcours complets, espace partenaire, scan caméra, débordement mobile
```

Test de charge (comptes **synthétiques** marqués `is_test_account`, exclus de toutes les statistiques réelles) :

```bash
npm run loadtest:users            # crée 1 000 comptes de test
npm run loadtest:run              # connexion, dashboard, carte, navigation, BDD, écritures, isolation RLS
npm run loadtest:cleanup          # supprime les comptes de test
```

Résultats : [`docs/TEST-CHARGE.md`](docs/TEST-CHARGE.md).

## Mise en production

Voir **[`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md)** : Supabase production, Vercel, domaine `unyafrica.com`, HTTPS, SMTP, analytics, premier administrateur, checklist de lancement.

## Applications Android et iOS

Le dossier `mobile/` contient les applications **Google Play** et **App Store** (Capacitor), compilées automatiquement par GitHub Actions (y compris iOS, sans Mac).
Comptes à créer, secrets, fiches des stores : **[`docs/APPLICATIONS-MOBILES.md`](docs/APPLICATIONS-MOBILES.md)**.

## Structure

```
src/
  app/
    (public)/        landing, conditions, confidentialité, hors ligne
    (auth)/          connexion, inscription, mot de passe oublié / réinitialisation
    (app)/           espace étudiant : accueil, carte, avantages, jobs, logement, marketplace, profil, favoris, notifications
    admin/           espace administrateur (layout séparé, accès admin vérifié côté serveur + RLS)
    partenaire/      espace partenaire (offres, boutique, logements, jobs, scanner)
    auth/            confirmation des liens email, déconnexion
    v/[token]/       vérification publique d'une carte (QR code)
  components/        design system (ui/), carte, contenus, admin, PWA
  lib/               clients Supabase, auth, requêtes, emails, formatage, constantes
  proxy.ts           rafraîchissement de session + protection des routes
supabase/
  migrations/        schéma, RLS, fonctions, stockage, référentiels, contenu de démo
  templates/         emails Auth (confirmation, récupération, changement d'email)
scripts/             admin, génération du contenu démo, test de charge
tests/e2e/           Playwright
```

## Données de démonstration

Le contenu pilote (12 partenaires, 18 avantages, 15 jobs, 10 logements, 20 annonces) est **entièrement fictif** et marqué `is_demo = true` : il s'affiche avec un badge **« Démo »** et un bandeau explicatif. Aucun partenariat réel n'est revendiqué. Un bouton *Admin → Statistiques → Supprimer tout le contenu « Démo »* le retire en un clic avant le lancement avec de vrais partenaires.
