# Environnements : production, préproduction, tests

État vérifié le 23/10/2026 (noms et cibles des variables Vercel, sans les valeurs).

| Variable Vercel | Production | Préversions (preview) | Constat |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | base de production | **base de production** | ⚠ non isolé |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé publique de production | **clé publique de production** | ⚠ non isolé |
| `SUPABASE_SERVICE_ROLE_KEY` | oui | absente | les préversions agissent avec les droits d'un utilisateur, sur les vraies données |
| `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL` | oui | absentes | — |

**La séparation n'est pas terminée** : elle demande un projet Supabase de préproduction (création par le
propriétaire du compte ; vérifier l'offre et le coût éventuel avant de créer).

## Garde-fous déjà en place (dans le code)

- **Préversions** : si une préversion utilise la base de production (`VERCEL_ENV=preview` + URL du projet de
  production), l'application s'arrête avec une page « Préversion non isolée » avant toute lecture ou écriture
  (`src/lib/env-guard.ts`, appliqué dans `src/lib/supabase/proxy.ts`). Actif dès le prochain déploiement.
- **Tests et scripts d'écriture** (`scripts/lib/target-guard.mjs`) : les tests de bout en bout
  (`playwright.config.ts`), les tests de charge (`scripts/load-test/*`) et la création d'admin local refusent de
  viser la production. Une base distante n'est acceptée que si elle est déclarée :
  `UNY_ALLOW_REMOTE_TARGET=<hôte de préproduction>`. La réinitialisation (`npm run db:reset`) ne vise que la base locale.
- `scripts/create-review-accounts.mts` (comptes de revue des stores) et `scripts/make-admin.mts` sont les seuls
  scripts prévus pour la production ; ils n'effacent rien.

## Mettre en place la préproduction (à faire par le propriétaire)

1. Supabase : créer un projet `uny-preprod` (même région, Paris), puis appliquer toutes les migrations du dépôt
   (`supabase link --project-ref <ref-preprod>` puis `supabase db push`). Aucune copie de données de production :
   les migrations de démonstration fournissent des données fictives ; créer un admin de test.
2. Vercel → Settings → Environment Variables, cible **Preview** uniquement :
   - `NEXT_PUBLIC_SUPABASE_URL` = URL du projet de préproduction (remplace la valeur héritée de la production) ;
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = clé publique de préproduction ;
   - `SUPABASE_SERVICE_ROLE_KEY` = clé de service de préproduction (sensible) ;
   - `NEXT_PUBLIC_SITE_URL` = URL de préversion (ex. `https://uny-git-<branche>-oumar-camara.vercel.app`) ;
   - `CRON_SECRET` et `UNY_MATCH_SECRET` = valeurs **différentes** de la production ;
   - ne pas définir `ANTHROPIC_API_KEY` ni `SMTP_*` (aucun envoi réel depuis la préproduction).
3. Retirer la cible « Preview » des deux variables publiques de production (elles ne doivent rester qu'en Production).
4. Tests contre la préproduction : `UNY_ALLOW_REMOTE_TARGET=<hôte-preprod> E2E_BASE_URL=<url de préversion> npx playwright test`.

Tant que l'étape 1 n'est pas faite : soit laisser le garde-fou arrêter les préversions (comportement par défaut
après déploiement), soit retirer dès maintenant la cible « Preview » des variables publiques de production.
