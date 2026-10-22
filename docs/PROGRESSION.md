# Progression — finalisation Uny et automatisation IA

Checklist de reprise. Légende : ✅ fait et vérifié (lieu indiqué) · 🟡 fait, à vérifier ailleurs · ⛔ bloqué (raison) · ⬜ à faire.
« Local » = Supabase local + données fictives. « Prod » = vérifié sur www.unyafrica.com.

Dernière mise à jour : 22/10/2026. Branche : `claude/uny-audit-securite-xf13tt` (copie sur `claude/uny-student-platform-xf13tt`).

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
- En attente d'autorisation : migrations `20261022000001_ai_agents.sql`, `20261022000002_ops_monitoring.sql` + code de cette branche.
