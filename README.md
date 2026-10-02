# Papel ERP

ERP de **Papel Industries** (mouchoirs en papier, usine de Coyah, Guinée) :
achat des matières premières → stock → production → distribution → vente → encaissement → pilotage.

- Règles métier et conventions : [`CLAUDE.md`](CLAUDE.md)
- Architecture et plan de livraison : [`docs/architecture.md`](docs/architecture.md)

## État d'avancement

| Étape | Contenu | État |
|---|---|---|
| Phase 1 – étape 1 | Fondations : connexion, rôles, droits (RLS), journal d'audit, paramètres, taux de change, produits et prix, calculs métier testés | ✅ Livrée |
| Phase 1 – étape 2 | Stocks : articles, bobines par lot, mouvements, coût moyen pondéré, inventaires, jours de couverture, alertes ; listes de référence modifiables ; TVA | ✅ Livrée |
| Phase 1 – étape 3 | Production : fiches de poste, ordres de fabrication, rendement réel/théorique, pertes, arrêts, TRS, alertes, coût de revient des produits finis, tableau de bord | ✅ Livrée |
| Phase 1 – étape 4 | Ventes : clients, devis → commande → livraison → facture TTC → paiement, dotation sur l'encaissé, avoirs, impayés et relances, documents imprimables, tableau de bord (CA, DSO…) | ✅ Livrée |
| Phase 1 – étape 5 | Application terrain installable et hors ligne (PVA, check-in GPS, photos, prix et concurrence, devis et factures numérotés hors ligne, synchronisation) ; supervision du responsable commercial (carte, visites, tournées, objectifs) | ✅ Livrée |
| Phase 1 – étape 6 | Tableau de bord Direction (5 domaines, comparaison, alertes du jour, carte, PDF, rapport hebdomadaire) | ✅ Livrée |
| Phase 2 – étape 1 | Achats : demandes d'achat, bons de commande (USD au taux du jour), conteneurs (suivi prévu/réel), frais d'approche, coût de revient complet au kg, réception des bobines par conteneur, transit, documents joints | ✅ Livrée |
| Phase 2 – étape 2 | Logistique : véhicules, chauffeurs, tournées (capacité, feuille de route imprimable), preuve de livraison (signature, photo, GPS), retours en stock, dépenses et coût par colis | ✅ Livrée |
| Phase 2 – étape 3 | Qualité : critères de contrôle paramétrables, contrôles à réception et en production, blocage des bobines, non-conformités et actions correctives, réclamations clients, traçabilité bobine ↔ lot de produits finis ↔ clients | ✅ Livrée |

## Installation en local

Prérequis : Node.js 22+, Docker (pour Supabase local).

```bash
npm install
cp .env.example .env.local
npm run db:start          # démarre Supabase en local (Docker)
npx supabase status       # affiche les clés à copier dans .env.local
npm run db:reset          # applique les migrations + données de démonstration
npm run dev               # http://localhost:3000
```

### Comptes de démonstration

Mot de passe commun : **`Papel2026!`** (uniquement en local, jamais en production).

| Identifiant | Rôle |
|---|---|
| `pdg` | Direction (accès total) |
| `admin` | Administrateur système |
| `achats` | Achats et approvisionnement |
| `magasin` | Magasin |
| `production` | Production |
| `maintenance` | Maintenance |
| `qualite` | Qualité (QHSE) |
| `resp.commercial` | Responsable commercial |
| `commercial1`, `commercial2`, `commercial3` | Commercial terrain |
| `logistique` | Logistique et livraison |
| `finance` | Comptabilité et finance |

## Tests

```bash
npm run verifier     # types + lint + tests unitaires des calculs (Vitest)
npm run test:db      # tests des droits en base (pgTAP) — Supabase local requis
npm run build && npm start   # puis, dans un autre terminal :
npm run test:e2e     # parcours dans un navigateur mobile (Playwright)
# ou, en une commande (base neuve + build + serveur + tests) :
npm run test:e2e:complet
```

## Mise en production (Supabase + Vercel)

1. **Supabase** : créer un projet (région Europe, ex. Paris `eu-west-3`, la plus proche de Conakry).
   Plan **Pro** recommandé : sauvegardes quotidiennes automatiques et restauration à une date (PITR en option).
2. Lier le projet, pousser les migrations, puis charger **une seule fois** la configuration initiale
   (paramètres, produits, prix, niveaux de prix, catégories, géographie — tout reste modifiable ensuite dans l'interface).
   Ne **jamais** charger `seed-demo.sql` en production.
   ```bash
   npx supabase link --project-ref <ref-du-projet>
   npx supabase db push
   psql "<chaîne de connexion du projet>" -f supabase/donnees-initiales.sql
   ```
3. Dans le tableau de bord Supabase :
   - **Authentication → Hooks** : activer « Customize Access Token (JWT) Claims » avec la fonction `public.hook_jeton_acces`.
   - **Authentication → Providers → Email** : désactiver « Confirm email ».
   - **Authentication → Settings** : désactiver « Allow new users to sign up » (seul l'admin crée les comptes).
4. Créer le premier compte Direction (une seule fois), dans **Authentication → Users → Add user** avec
   l'e-mail `identifiant@papel.local`, puis dans l'éditeur SQL :
   ```sql
   insert into public.utilisateur_roles (utilisateur_id, role)
   select id, 'direction' from public.profils where identifiant = 'identifiant-choisi';
   ```
   Les autres comptes se créent ensuite depuis **Administration → Utilisateurs**.
5. Pour chaque commercial terrain : **Administration → Utilisateurs → (commercial) → Série de numérotation** (ex. C01).
   Sans série, l'application terrain ne peut pas émettre de facture.
6. **Vercel** : importer le dépôt GitHub et renseigner les variables
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (voir `.env.example`),
   et `NEXT_PUBLIC_TUILES_URL` (fournisseur de fonds de carte, ex. MapTiler ; OpenStreetMap n'est pas fait pour un usage intensif).

### Installer l'application sur un téléphone Android

Ouvrir l'adresse de l'ERP dans Chrome, se connecter avec le compte du commercial, puis menu ⋮ → **« Ajouter à l'écran d'accueil »**.
L'application s'ouvre ensuite comme une application native, même sans réseau (après une première ouverture connectée).

## Sauvegardes

- **Automatiques** : sauvegardes quotidiennes de Supabase (plan Pro, conservées 7 jours ; PITR en option).
- **Manuelles** (à faire au moins chaque semaine, et conserver hors de Supabase) :
  ```bash
  npx supabase db dump --linked -f sauvegarde-schema.sql
  npx supabase db dump --linked --data-only -f sauvegarde-donnees-$(date +%F).sql
  ```
- **Restauration** : `psql "<chaîne de connexion>" -f sauvegarde-schema.sql -f sauvegarde-donnees-AAAA-MM-JJ.sql`
- Photos du terrain (Storage, bucket `photos-terrain`) : incluses dans les sauvegardes Supabase du plan Pro ; copie manuelle possible avec
  `npx supabase storage cp -r ss:///photos-terrain ./sauvegarde-photos --linked --experimental`.

## Structure

```
src/app/            pages (un espace par rôle : /direction, /magasin, /terrain, /admin…)
src/lib/metier/     calculs métier purs et testés (unités, rendement, devises, prix, dotation)
src/lib/auth/       rôles, espaces, session
src/lib/supabase/   clients Supabase et types générés
supabase/migrations migrations SQL versionnées
supabase/donnees-initiales.sql  configuration de départ (production comprise)
supabase/seed-demo.sql          données de démonstration (local uniquement)
src/lib/referentiels/           listes de référence modifiables (définitions + page générique)
supabase/tests/     tests des droits (pgTAP)
e2e/                parcours de bout en bout (Playwright)
```
