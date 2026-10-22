# Surveillance, pilotage et agents IA

Mis à jour le 22 octobre 2026. Tout ce qui suit est **vérifié en local** (Supabase local, données fictives, fournisseur IA
remplacé par un bouchon). Rien n'est déployé en production.

## 1. Surveillance (sans IA)

| Élément | Où | Fonctionnement |
|---|---|---|
| Exécutions des tâches | `ops_job_runs`, `src/lib/ops/jobs.ts` | clé d'idempotence, 3 tentatives au plus, puis « échec définitif » ; une clé réussie n'est jamais rejouée |
| Règles d'alerte | `ops_run_checks()` | règles SQL fixes (ci-dessous), alertes dédupliquées par empreinte, résolues automatiquement quand la condition disparaît |
| Évaluation | tâche quotidienne `/api/cron/surveillance` (07:05 UTC) + bouton « Évaluer les règles maintenant » | protégée par `CRON_SECRET` |
| Traitement | `/admin/pilotage` | prise en charge (responsable = administrateur qui clique), résolution avec note |
| Nettoyage | `src/lib/ops/redact.ts` | emails, téléphones, jetons, clés, URL signées et identifiants masqués avant stockage d'une erreur ou envoi à un service externe |

Les tâches Vercel ne peuvent pas tourner plus d'une fois par jour sur l'offre actuelle : l'évaluation est donc
quotidienne, plus le bouton manuel. Pour une surveillance horaire, il faut une offre Vercel supérieure ou un
déclencheur externe appelant `/api/cron/surveillance` avec le secret.

| Règle | Gravité | Condition |
|---|---|---|
| `job_failed` | élevée / critique si définitif | tâche en échec dans les 26 h |
| `backup_missing` | critique | aucune sauvegarde depuis 30 h |
| `card_invalid_burst` | moyenne | ≥ 5 cartes expirées ou révoquées présentées chez un même commerçant en 24 h |
| `card_sharing` | moyenne | une carte présentée chez ≥ 4 commerçants en 1 h |
| `coupon_burst` | moyenne | ≥ 30 coupons utilisés chez un même commerçant en 1 h |
| `queue_enrollments` · `queue_verifications` · `queue_signups` | moyenne | demandes > 7 j · justificatifs > 72 h · comptes > 72 h en attente |
| `queue_reports` | élevée | signalements marketplace non traités depuis 48 h |
| `ai_budget` · `ai_failures` | moyenne/élevée · élevée | budget IA ≥ 80 % (≥ 100 % : élevée) · ≥ 3 échecs d'un agent en 24 h |

Non couverts faute de source (affichés « Non disponible ») : disponibilité du site (aucune sonde externe), échecs de
connexion inhabituels (journaux Supabase Auth non exportés), coûts Vercel/Supabase (pas d'API branchée).
Sentry n'a pas été ajouté : les erreurs serveur sont déjà visibles dans Vercel (journaux d'exécution) et un compte
externe serait nécessaire. Recommandation : une sonde de disponibilité gratuite (ex. toutes les 5 min sur la page
d'accueil) avec alerte email à l'équipe, à créer par le propriétaire du compte.

## 2. Indicateurs

Dictionnaire complet : `src/lib/metrics.ts` (définition, source, formule, fenêtre, exclusions), affiché sur
`/admin/pilotage`. Calcul : `ops_metrics(p_days)` (administrateurs et clé de service uniquement), période glissante,
fuseau Africa/Conakry, comptes de test et démonstrations exclus, date de calcul affichée.
« Montants déclarés » ≠ chiffre d'affaires : Uny n'encaisse rien. Chiffre d'affaires attribuable, revenus
récurrents et conversion vue → achat sont affichés « Non disponible » avec la raison.

## 3. Centre IA (`/admin/ia`)

État affiché par agent : **Non configuré** (clé absente, budget nul ou IA désactivée) · **Suspendu** · **Actif** ·
**En erreur** (dernière exécution en échec). Par défaut : IA désactivée, budgets à 0 → aucun appel payant.

Chaque appel réserve d'abord son **coût maximal** (`ai_reserve`, sous verrou : pas de dépassement en parallèle) :
entrée majorée par la taille en octets du contexte (un jeton couvre au moins un octet, donc jamais sous-estimée,
même pour des emojis), sortie au plafond `max_tokens` (raisonnement compris), au tarif le plus élevé du modèle.
Aucun modèle de remplacement automatique, aucune relance (`maxRetries: 0`) : un appel ne peut pas coûter plus que sa
réservation. Seuls les modèles dont le tarif est vérifié sont autorisés (Opus 5.5, Sonnet 5.5, Haiku 5.5 ;
contrainte en base). Clôture unique (`ai_close`) :

| Situation | État | Coût compté |
|---|---|---|
| réponse reçue | `succeeded` / `failed` (vide ou refus) | coût réel d'après l'usage renvoyé |
| erreur HTTP renvoyée par le fournisseur | `failed` | 0 (requête non facturée) |
| délai dépassé, coupure réseau, modèle inattendu | `to_reconcile` | coût maximal réservé conservé |
| clôture impossible à enregistrer | reste `running`, puis `to_reconcile` (vérification) | coût maximal réservé conservé |

Le rapprochement (`/admin/ia`, coût relevé dans la console du fournisseur, source obligatoire) se fait une seule
fois ; une clôture tardive ne recompte rien. Le tableau de bord distingue estimé, réservé, enregistré et à
rapprocher. **Ce plafond est applicatif** : il ne garantit pas la facture du fournisseur ; configurer aussi une
limite de dépense dans la console Anthropic. Tarifs vérifiés le 22/10/2026 :
https://platform.claude.com/docs/en/about-claude/pricing (Opus 5.5 : 4 $ / 20 $ par million de jetons ;
Sonnet 5.5 : 2 $ / 10 $ ; Haiku 5.5 : 0,10 $ / 0,50 $, 0,50 $ / 2,50 $ au-delà de 100 000 jetons d'entrée).

### Matrice des permissions

| Agent | Données lues (côté serveur) | Outils (liste fixe en base) | Peut écrire | Ne peut pas |
|---|---|---|---|---|
| Analyste | `ops_metrics` et alertes ouvertes, lus **avec la session de l'administrateur** (contrôle SQL) ; agrégats uniquement | `metrics.read`, `alerts.read` | un rapport (`ai_reports`, lisible par les administrateurs seuls) | déclencher une action, lire des données nominatives |
| Support | documentation validée (`src/lib/ai/support-docs.ts`) + statut de **la personne connectée** (session vérifiée, RLS) | `docs.search`, `me.status`, `handoff.create` | ses messages dans la conversation de la personne ; transfert à l'équipe | valider/refuser une inscription, modifier des droits, révoquer une carte, supprimer un compte, payer, lire un autre compte ou établissement |
| Développeur (diagnostic) | une alerte nettoyée | `alerts.read`, `diagnosis.write` | un diagnostic (`ai_reports`) | lire le code, la base de production ou des secrets ; créer une branche ou une PR ; fusionner |

Communs à tous : aucun outil n'est exposé au modèle (le serveur prépare le contexte autorisé) ; aucun SQL ni commande
libre ; aucun secret dans le contexte ; contenus utilisateurs encadrés comme « données non fiables » ; les agents ne
peuvent pas modifier leurs outils, leurs limites ni les approbations (seule une migration ou un administrateur via
`ai_configure`, journalisé, change les limites — jamais les outils).

### Approbations (actions sensibles futures)

`ai_approval_request` → `ai_approval_decide` (administrateur, différent du demandeur) → `ai_approval_consume` juste
avant l'exécution : même action, mêmes paramètres (empreinte SHA-256), non expirée (1 h), une seule fois. Toute
modification invalide l'approbation. Aucun agent n'utilise encore ce mécanisme.

## 4. Agent développeur : ce qui est livré et ce qui manque

Livré : **mode diagnostic** — alerte dédupliquée → bouton « Diagnostic IA » → proposition écrite (causes possibles
marquées « Hypothèse », vérifications, correction proposée), un diagnostic par alerte et par jour.

Manque pour la correction automatisée (branche → tests → PR → revue humaine) :
1. Un environnement d'exécution isolé (conteneur éphémère sans accès réseau à la production ni aux secrets).
2. Une GitHub App dédiée avec permissions minimales (contenu + pull requests sur ce dépôt, sans droit d'administration,
   sans contournement des protections de branche), branche `main` protégée avec revue obligatoire.
3. Une base de test séparée (Supabase locale dans le conteneur) pour les tests.
4. Décision du propriétaire sur le budget et le périmètre.
Une PR restera une proposition : ni approbation ni fusion automatique.

## 5. Coûts estimés (au 22/10/2026)

Tarifs Anthropic relevés le 22/10/2026 (table du 06/10/2026, https://platform.claude.com/docs/en/about-claude/pricing) :
Claude Opus 5.5 = 4 $ / million de jetons en entrée, 20 $ / million en sortie (modèle configuré par défaut) ;
Claude Haiku 5.5 = 0,10 $ / 0,50 $. Hypothèses (non mesurées sur trafic réel) :

| Usage | Jetons par appel (entrée / sortie, raisonnement compris) | Coût unitaire Opus 5.5 | Volume supposé / mois | Coût / mois |
|---|---|---|---|---|
| Support | ~1 500 / ~400 | ~0,014 $ | 1 000 questions | ~14 $ |
| Analyste | ~3 000 / ~3 000 | ~0,07 $ | 30 rapports | ~2 $ |
| Diagnostic | ~1 500 / ~2 500 | ~0,06 $ | 20 alertes | ~1,2 $ |

Proposition de départ : plafond global 20 $/mois. Avec Claude Haiku 5.5 (modifiable dans `ai_agents.model`), le
support coûterait environ 40 fois moins ; choix à faire par le propriétaire selon la qualité observée.
Les coûts réels s'affichent dans `/admin/ia` (jetons et coût par exécution).

## 6. Activer en production (après autorisation)

1. Appliquer les migrations `20261022000001_ai_agents.sql` puis `20261022000002_ops_monitoring.sql`.
2. Vercel : ajouter `ANTHROPIC_API_KEY` (sensible, Production uniquement). Déployer.
3. `/admin/ia` : fixer le plafond global, puis activer un agent avec son plafond (commencer par l'analyste).
4. Retour arrière : désactiver l'IA dans `/admin/ia` (effet immédiat) ; les tables peuvent rester en place.
