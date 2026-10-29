# Progression — finalisation Uny et automatisation IA

Checklist de reprise. Légende : ✅ fait et vérifié (lieu indiqué) · 🟡 fait, à vérifier ailleurs · ⛔ bloqué (raison) · ⬜ à faire.
« Local » = Supabase local + données fictives. « Prod » = vérifié sur www.unyafrica.com.

Dernière mise à jour : 22/10/2026. Branche : `claude/uny-audit-securite-xf13tt` (copie sur `claude/uny-student-platform-xf13tt` ; PR #1 fusionnée dans `main`).

## 1. Sécurité et intégrité
- ✅ Isolation interétablissements (RLS, fonctions, export, fiche étudiant) — local (tests 14, 18) ; migrations en prod le 21/10
- ✅ Établissement en attente : aucun dossier, préparation de l'espace possible — local (14, 18)
- ✅ Tâches planifiées : `CRON_SECRET` obligatoire, pas de User-Agent — local (16) et prod (401 / 200 le 21/10)
- ✅ Cartes, offres, coupons revérifiés à l'utilisation ; carte révoquée, offre expirée — local (15)
- ✅ Quotas et coupons atomiques (concurrence) — local (15)
- ✅ Suppression du compte et des fichiers avec gestion d'erreurs — local
- ✅ Caches séparés par compte ; pages personnelles (dont Aide, Admin) jamais en cache (sw `uny-v3`) — local
- ✅ Reprise des tâches sans double effet (idempotence, tentatives limitées) — local (19)
- ⛔ Séparation des environnements : les prévisualisations Vercel utilisent la base de production → créer un projet Supabase de test (accès propriétaire requis)
- ⛔ Emails transactionnels : `SMTP_*`, `EMAIL_FROM` absents en production
- 🟡 Sauvegarde et restauration : sauvegarde quotidienne vérifiée en prod le 21/10 ; restauration testée sur base isolée locale

## 2. Parcours métier
- ✅ Établissements : tuiles d'actions, listes filtrées, statuts contrôlés, motif/responsable/date, rôles, équipe, historique, export journalisé
- ✅ Fiche étudiant (demandes successives + historique des décisions) — local (18)
- ✅ Commerçants : Scanner en premier, confirmation explicite, responsable/caissier, indicateurs séparés
- ✅ Étudiants : 5 onglets, Opportunités (jobs, logement, marketplace), prochaine démarche sur l'accueil, brouillons, carte hors ligne datée
- ✅ Aide : assistant + transfert humain (`/aide`), fonctionne sans IA

- ✅ Vérification étudiante stricte (22/10, demandée par le propriétaire) — local (03, 18, 20) :
  justificatif = 4 contrôles cochés + matricule et année lus sur le document + aucun doublon (fichier, matricule) ;
  étudiant d'un établissement partenaire → confirmation par l'établissement ; portail : référence du registre +
  4 critères ; plus de « validation manuelle du statut » ; BAC : référence officielle obligatoire ; réductions
  réservées aux étudiants vérifiés.
- ✅ Établissements : dossier (agrément, signataire, lettre signée) + contrôles Uny (source de l'agrément, rappel au
  numéro officiel trouvé par Uny, signataire habilité) ; seule `approve_university` rend partenaire — local (08, 20)
- ✅ Commerçants : prix étudiant calculé automatiquement (prix normal + réduction en % ou en GNF, arrondi à la
  centaine inférieure), imposé par la base — local (09, 12, 20)

## 3. Mobile et stores
- ✅ Chaînes : Google Play = `android/` (API 36), App Store = `mobile/ios` ; CI verte (PR #1)
- ✅ Signalement, blocage, file de modération ; suppression du compte (app + web)
- ✅ Inventaire des données mis à jour (assistant IA ajouté) — `docs/PUBLICATION-STORES.md`
- ⛔ Compte Google Play (choix organisation D-U-N-S ou personnel + 12 testeurs × 14 jours)
- ⛔ Compte Apple Developer, Mac/Xcode, `APPLE_TEAM_ID`
- ⬜ Tests sur appareils réels (liste § 7 de `docs/PUBLICATION-STORES.md`) — non exécutés
- ⬜ Build signé (AAB et iOS) — non exécuté (secrets de signature non fournis à la CI)

## 4. Surveillance et pilotage
- ✅ Alertes déterministes, déduplication, gravité, responsable, état — local (19)
- ✅ Dictionnaire des indicateurs, « Non disponible » justifié — local (19)
- ✅ Page `/admin/pilotage`, tâche `/api/cron/surveillance` — local
- ⬜ Sonde de disponibilité externe (compte à créer par le propriétaire)

## 5. Centre IA, analyste, support
- ✅ Registre des agents, états réels, budgets, arrêt, historique, approbations liées aux paramètres — local (19)
- ✅ Analyste à la demande (agrégats, rapports réservés aux administrateurs) — local avec bouchon
- ✅ Support : identité serveur, documentation validée, statut personnel, transfert humain, cloisonnement — local avec bouchon
- ✅ Plafond de budget (y compris 10 appels simultanés), indisponibilité du fournisseur — local avec bouchon
- 🟡 Qualité des réponses et résistance réelle du modèle à l'injection : à évaluer avec une vraie clé et un budget (non fait)
- ⬜ Fréquence programmée de l'analyste : à ajouter après validation de la génération à la demande en production

## 6. Agent développeur
- ✅ Mode diagnostic (alerte → proposition) — local avec bouchon
- ⛔ Correction automatisée : environnement isolé, GitHub App minimale, base de test (voir `docs/PILOTAGE.md` § 4)

## Déploiement
- Prod au 21/10 : migrations 20261021000001–06 + code `cdf39bc`.
- Prod au 22/10 (autorisation du propriétaire) : sauvegarde préalable `uny-2026-10-22-05-36-00`, migrations
  `20261022000001`, `20261022000002` (+ `20261022055514`, même contenu que la clé « ai »), code `7036cce`,
  déploiement `dpl_3G11DdiZ2GwjEo8E27v2qhTt5cBo`. Vérifié en prod : pages publiques 200 ; `/aide` et `/admin/pilotage`
  redirigent vers la connexion ; `/api/cron/surveillance` 401 sans secret (y compris User-Agent usurpé), 200 avec ;
  sauvegarde du jour créée puis second passage ignoré (« déjà effectuée ») ; aucune erreur d'exécution ; aucune
  notification envoyée ; IA désactivée, budgets à 0, aucun appel IA. Première alerte réelle : 8 justificatifs en
  attente depuis plus de 72 h. Non rejoué en prod : parcours connectés (portails, Pilotage, Centre IA, Aide).
- Retour arrière : redéployer `dpl_ET2KHBAgwZ1gYWJqHZC2V4WN6hdh`, puis si nécessaire `supabase/rollback/20261022_rollback.sql`.
- Prod au 22/10 après-midi (autorisation du propriétaire) : sauvegarde `uny-2026-10-22-15-53-16`, migrations
  `20261022100001` à `03`, code `d73d915`, déploiement `dpl_G1fmYdfLdj4kVDnQwniojXmZsH5X`. Vérifié en prod : pages
  publiques 200 ; surveillance 401 sans secret / 200 avec ; prix calculé par la base (25 000 GNF, -15 % → 21 200 GNF,
  insertion annulée) ; offre ouverte aux non-vérifiés refusée ; 18 offres reprises sans changement de prix ; 0 offre
  ouverte aux non-vérifiés ; déclencheur « partenaire » actif ; aucune erreur d'exécution. Non rejoué en prod :
  parcours connectés (justificatif, portail, dossier établissement), testés en local seulement.
- Retour arrière de ce lot : redéployer `dpl_3G11DdiZ2GwjEo8E27v2qhTt5cBo`, puis si nécessaire
  `supabase/rollback/20261022_controles_rollback.sql`.

- Prod au 22–23/10, correctifs après revue (autorisation du propriétaire) : sauvegarde `uny-2026-10-22-23-40-39`,
  migrations `20261022200001` (appliquée en premier, seule), puis `200002` à `200004` (+ `20261022234132`, contraintes
  appliquées séparément, même contenu), code `931791d`, déploiement `dpl_4heZxfBV1WX1HmLbpj2um7SiSTHm`. Vérifié en
  prod : utilisateur extérieur refusé par `publish_card_template` (42501, essai annulé, 0 modèle créé) ; fonctions
  et droits en place (anon et utilisateurs sans accès aux fonctions internes) ; file de traitement cohérente avec
  les alertes (8 justificatifs et 9 BAC en retard) ; pages publiques 200 avec les nouveaux textes ; `/aide`,
  `/admin/pilotage`, `/admin/ia` redirigent vers la connexion ; surveillance 401 sans secret (y compris User-Agent
  usurpé), 200 avec ; aucune erreur d'exécution ; aucune notification envoyée ; IA désactivée, budget 0, aucun
  appel. Non rejoué en prod : réponse du support, rapprochement IA, parcours pilote connecté (testés en local).
- Retour arrière de ce lot : redéployer `dpl_G1fmYdfLdj4kVDnQwniojXmZsH5X`, puis si nécessaire
  `supabase/rollback/20261022_revue_rollback.sql` (ne touche pas au correctif `200001`).

## Correctifs après revue (22/10) — déployés le 23/10 (voir « Déploiement »)
- ✅ publish_card_template : refus tant que l'autorisation n'est pas strictement vraie (défaut NULL confirmé en local,
  motif présent en production, aucun modèle créé depuis le 21/10) — test 21 + contre-épreuve — migration `20261022200001`
- 🟡 Environnements : préversions arrêtées si branchées sur la production ; tests/scripts refusent la production ;
  ⛔ base de préproduction à créer (docs/ENVIRONNEMENTS.md)
- ✅ Support : file, réponse notifiée dans l'app, sans doublon, panne de notification sans perte — test 21 — `20261022200002`
- ✅ Coûts IA : coût maximal réservé, pas de remplacement ni relance, à rapprocher, tableau de bord — test 22 — `20261022200003`
- ✅ Textes publics : compte ≠ carte vérifiée, aucun délai ni email promis par défaut — test 01
- ✅ File de traitement + prochaine étape étudiante — test 23 — `20261022200004`
- ✅ Parcours pilote complet (fictif) — test 23
- ⬜ Appareils réels (caméra, retour Android, zones iPhone, liens, signatures) : non exécutés

## Offres façon UNiDAYS (29/10) — déployées le 29/10 (voir ci-dessous)
- ✅ Vitrine des offres : Exclusivités Uny, Tendances (14 j : vues + codes + ouvertures), Flash, À distance, Marques,
  Nouveautés ; filtre « À distance / En magasin » — local (24)
- ✅ Pages des marques (`/avantages/marques`, `/avantages/marques/[id]`) — local (24)
- ✅ Offres à distance, adaptées aux marques sans site : contact WhatsApp, appel, page Facebook/Instagram ou site s'il
  existe ; code personnel Uny (recommandé, validé dans « Scanner ») ou code fixe ; message WhatsApp prérempli avec le
  code. Contact et code dans `deal_online_access`, jamais lisibles publiquement, révélés par `open_online_offer` aux
  seuls étudiants vérifiés avec carte valable — local (24 + tests SQL fictifs)
- ✅ Exclusivité réservée à l'administration (déclencheur) ; statistiques par offre pour la marque (30 j : vues,
  ouvertures à distance, codes obtenus, utilisés) — local (24)
- ✅ Politique de confidentialité : demandes de contact à distance mentionnées
- ✅ Correctif annexe : l'analyste IA nettoie les titres d'alertes (emails, téléphones) avant envoi — local (19)
- Suite complète : 90/90 en local
- Migration `20261029000001_offers_catalog.sql` (non destructive) ; retour arrière `supabase/rollback/20261029_offres_rollback.sql`
- ⬜ Recrutement de marques et premières exclusivités (action commerciale, hors code)
- Prod au 29/10 (autorisation du propriétaire) : sauvegarde `uny-2026-10-29-11-22-21` (2 827 lignes), migration
  `20261029000001` appliquée par étapes, code `6623528`, déploiement `dpl_4B3TfbdVKWiTHdPDEURdwE3PW5Di`. Vérifié en
  prod : 36 offres existantes inchangées (en magasin, sans exclusivité) ; tables protégées (RLS, aucun accès anonyme) ;
  `open_online_offer` refusé pour un compte sans offre à distance, statistiques refusées hors marque (42501), aucun
  clic enregistré (essai annulé) ; pages publiques 200, pages connectées redirigent vers la connexion ; surveillance
  401 / 200 ; aucune erreur d'exécution. Non rejoué en prod : parcours connectés (vitrine, WhatsApp, Scanner),
  testés en local seulement.
- Retour arrière : redéployer `dpl_4heZxfBV1WX1HmLbpj2um7SiSTHm`, puis si nécessaire `supabase/rollback/20261029_offres_rollback.sql`.

## Démos de la vitrine (29/10) — déployées le 29/10
- ✅ 6 exclusivités et des offres « à distance » de démonstration (marques fictives Wax & Style Couture, Délices
  Livraison ; offres existantes converties), toutes marquées « Démo » — migration `20261029000002_demo_offers.sql`
  (idempotente, ne touche que des lignes `is_demo`)
- ✅ Aucun contact réel pour les démos ; `open_online_offer` refuse les offres de démonstration ; fiche : explication
  au lieu du bouton de commande — local (25)
- ✅ Sans activité réelle, la rangée « Tendances » devient « Meilleures réductions » (jamais de fausses tendances)
- Suite complète : 91/91 en local
- Prod au 29/10 (autorisation du propriétaire) : sauvegarde `uny-2026-10-29-15-02-49`, migration `20261029000002`
  (blocage des démos appliqué avant les données), code `f1e2b03`, déploiement `dpl_DYnav2fJQjY1wVmTxNg7Jmtzep26`.
  Vérifié en prod : 40 offres de démo dont 8 exclusivités et 8 à distance ; aucune offre réelle modifiée ; aucun
  contact enregistré ; ouverture d'une démo refusée par la base (essai annulé, 0 clic) ; pages 200 / redirections ;
  aucune erreur d'exécution. Retour arrière : redéployer `dpl_4B3TfbdVKWiTHdPDEURdwE3PW5Di` (les démos restent
  marquées « Démo » et sans contact).
