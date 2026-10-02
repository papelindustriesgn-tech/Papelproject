# Papel ERP

ERP de **Papel Industries** (mouchoirs en papier, usine de Coyah, Guinée) :
achat des matières premières → stock → production → distribution → vente → encaissement → pilotage.

- Règles métier et conventions : [`CLAUDE.md`](CLAUDE.md)
- Architecture et plan de livraison : [`docs/architecture.md`](docs/architecture.md)

## État d'avancement

| Étape | Contenu | État |
|---|---|---|
| Phase 1 – étape 1 | Fondations : connexion, rôles, droits (RLS), journal d'audit, paramètres, taux de change, produits et prix, calculs métier testés | ✅ Livrée |
| Phase 1 – étape 2 | Stocks | À venir |
| Phase 1 – étape 3 | Production | À venir |
| Phase 1 – étape 4 | Ventes simples | À venir |
| Phase 1 – étape 5 | Application terrain hors ligne | À venir |
| Phase 1 – étape 6 | Tableau de bord Direction | À venir |

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
```

## Mise en production (Supabase + Vercel)

1. **Supabase** : créer un projet (région Europe, ex. Paris `eu-west-3`, la plus proche de Conakry).
   Plan **Pro** recommandé : sauvegardes quotidiennes automatiques et restauration à une date (PITR en option).
2. Lier le projet et pousser les migrations (sans les données de démonstration) :
   ```bash
   npx supabase link --project-ref <ref-du-projet>
   npx supabase db push
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
5. **Vercel** : importer le dépôt GitHub et renseigner les variables
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (voir `.env.example`).

## Sauvegardes

- **Automatiques** : sauvegardes quotidiennes de Supabase (plan Pro, conservées 7 jours ; PITR en option).
- **Manuelles** (à faire au moins chaque semaine, et conserver hors de Supabase) :
  ```bash
  npx supabase db dump --linked -f sauvegarde-schema.sql
  npx supabase db dump --linked --data-only -f sauvegarde-donnees-$(date +%F).sql
  ```
- **Restauration** : `psql "<chaîne de connexion>" -f sauvegarde-schema.sql -f sauvegarde-donnees-AAAA-MM-JJ.sql`
- Les photos (Storage) seront sauvegardées par un script dédié livré avec l'application terrain (étape 5).

## Structure

```
src/app/            pages (un espace par rôle : /direction, /magasin, /terrain, /admin…)
src/lib/metier/     calculs métier purs et testés (unités, rendement, devises, prix, dotation)
src/lib/auth/       rôles, espaces, session
src/lib/supabase/   clients Supabase et types générés
supabase/migrations migrations SQL versionnées
supabase/seed.sql   données de démonstration
supabase/tests/     tests des droits (pgTAP)
e2e/                parcours de bout en bout (Playwright)
```
