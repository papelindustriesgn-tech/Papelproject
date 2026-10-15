# Test de charge — 1 000 utilisateurs synthétiques

> ⚠️ **Il s'agit de comptes de test générés automatiquement**, pas de vrais étudiants.
> Ils sont marqués `is_test_account = true` (drapeau serveur, non modifiable par l'utilisateur), exclus de toutes les statistiques « réelles » du dashboard admin, et supprimables avec `npm run loadtest:cleanup`.

## Conditions

| | |
| --- | --- |
| Date | 29 septembre 2026 |
| Machine | 1 seule VM **4 vCPU** (Xeon 2,1 GHz), 17 Go RAM |
| Sur la même machine | Next.js en production (`next start`, **1 seul processus**), Supabase complet (Postgres, Auth, REST, Storage) dans Docker, **et** le générateur de charge |
| Utilisateurs | 1 000 comptes synthétiques, tous connectés |
| Concurrence | **50 requêtes simultanées en continu** |
| Volume | 9 200 requêtes applicatives + 1 000 connexions |

C'est un scénario **défavorable** : en production, Vercel exécute les pages sur des fonctions qui montent en charge horizontalement, et Supabase dispose de sa propre machine. Les temps ci-dessous sont donc des **bornes hautes**.

## Résultats (après optimisation)

| Scénario | Requêtes | Erreurs | Débit | p50 | p95 | p99 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1. Connexion (Supabase Auth, bcrypt) | 1 000 | **0** | 26,7 /s | 1 849 ms | 2 307 ms | 2 554 ms |
| 2. Dashboard `/accueil` (rendu serveur) | 1 000 | **0** | 21,6 /s | 1 692 ms | 2 235 ms | 3 071 ms |
| 3. Carte digitale `/carte` (QR généré) | 1 000 | **0** | 42,9 /s | 947 ms | 1 092 ms | 1 284 ms |
| 4. Avantages / jobs / logement / marketplace (filtres) | 3 000 | **0** | 32,1 /s | 1 053 ms | 1 348 ms | 1 479 ms |
| 5. Base de données : profil + carte + offres (API + RLS) | 1 000 | **0** | 84,9 /s | 513 ms | 1 285 ms | 1 786 ms |
| 6a. Écriture : favoris (RLS) | 1 000 | **0** | 776 /s | 52 ms | 148 ms | 220 ms |
| 6b. Écriture : 200 annonces marketplace | 200 | **0** | 744 /s | 51 ms | 149 ms | 202 ms |

### Contrôles de sécurité sous charge

- **Isolation des sessions** : chaque dashboard rendu contient bien le prénom de *son* utilisateur → **0 erreur sur 1 000**.
- **Isolation RLS** : 100 tentatives de lecture du profil d'un autre utilisateur → **0 fuite**.
- Les écritures de test (favoris, annonces) sont supprimées à la fin du scénario.

## Optimisations apportées suite au test

| Scénario | Avant (débit / p95) | Après (débit / p95) |
| --- | --- | --- |
| Dashboard `/accueil` | 15,4 /s · 3 883 ms | **21,6 /s · 2 235 ms** |
| Carte `/carte` | 29,3 /s · 1 966 ms | **42,9 /s · 1 092 ms** |
| Navigation contenus | 21,3 /s · 2 529 ms | **32,1 /s · 1 348 ms** |

1. **Cache serveur des contenus publics** (offres, jobs, logements, annonces, quartiers) : identiques pour tous les étudiants → mis en cache 60 s et invalidés immédiatement à chaque modification (admin ou vendeur). Seules les données personnelles (profil, favoris, notifications) sont lues à chaque requête.
2. **Vérification locale des sessions** (`getClaims` + clés JWT asymétriques ES256) : plus d'aller-retour vers le serveur d'authentification à chaque page.
3. Dashboard : une requête d'offres au lieu de deux.

Rapports bruts : [`scripts/load-test/results/`](../scripts/load-test/results/).

## Interprétation pour le pilote

- **1 000 inscrits ≠ 1 000 requêtes simultanées.** Pour 1 000 étudiants inscrits, on observe typiquement quelques dizaines d'utilisateurs actifs au même moment. Le test maintient 50 requêtes *en permanence*, soit bien au-delà de l'usage attendu, sans aucune erreur.
- Même sur une seule petite machine qui héberge tout, l'application sert **plus de 20 dashboards par seconde** (≈ 1 300 par minute).
- La **connexion** est volontairement coûteuse (hachage bcrypt des mots de passe). Elle n'a lieu qu'une fois par appareil, car la session est ensuite conservée et rafraîchie automatiquement.
- En production : penser à relever la limite *Sign-ups and sign-ins* dans Supabase (voir [DEPLOIEMENT.md](DEPLOIEMENT.md) §1.7), car les connexions passent par le serveur Vercel.

## Poids des pages (réseaux mobiles limités)

| Page | HTML compressé (gzip) |
| --- | ---: |
| Landing `/` | 19,6 Ko |
| Connexion | 6,3 Ko |
| Inscription | 7,3 Ko |

Photos : servies en AVIF/WebP redimensionnées à la taille de l'écran (next/image), chargement différé, compressées sur le téléphone avant envoi (max 1 280 px). Squelettes de chargement sur les listes. Service worker : cache des images et assets, carte consultable hors ligne.

## Reproduire

```bash
npm run build && npm start          # terminal 1
npm run loadtest:users              # crée les 1 000 comptes synthétiques
npm run loadtest:run                # lance le scénario (N=1000, concurrence=50)
npm run loadtest:cleanup            # supprime les comptes synthétiques
```
