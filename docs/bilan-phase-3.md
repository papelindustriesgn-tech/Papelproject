# Bilan de la phase 3 — Papel ERP

Date : 09/10/2026. Branche : `claude/cadrage-architecture`.

## Livré

| Étape | Contenu |
|---|---|
| 1. Finance | Comptes de trésorerie (caisse, banques GNF/USD, Orange Money, MTN) avec journal **inaltérable** alimenté automatiquement par les encaissements clients et les règlements fournisseurs ; virements ; caisse jamais négative. Factures fournisseurs (GNF ou USD, TVA), règlements, balance âgée. Charges fixes mensuelles générées chaque mois. **Compte de résultat** mensuel (6 mois), **seuil de rentabilité**, **BFR**, **trésorerie prévisionnelle** sur 13 semaines avec alerte de tension |
| 2. Exports et rapports | Journaux **SYSCOHADA** (ventes, achats, trésorerie) en CSV compatible Excel, pièces contrôlées équilibrées ; **rapport hebdomadaire envoyé par e-mail** chaque lundi (ventes, production, stock, trésorerie, qualité, maintenance, points d'attention) |

Tableau de bord Direction : trésorerie, créances et dettes échues, BFR.

## Qualité du logiciel

- Vitest : 137 tests (dont résultat, seuil, BFR, prévisionnel, écritures comptables équilibrées, mise en forme du rapport).
- pgTAP : 161 tests (fichiers 10 et 11 : droits, trésorerie automatique, règlements, caisse protégée, journal inaltérable, rapport réservé à la tâche planifiée).
- Playwright : 46 parcours, dont facture fournisseur → règlement → trésorerie, exports CSV, accès refusés.

## Ce que l'équipe Papel doit faire avant la mise en service

1. **Avec le comptable** : valider le plan de comptes (paramètres `compta_compte_*`, comptes des catégories de charges et des
   comptes de trésorerie — valeurs SYSCOHADA indicatives) et le régime de TVA (récupérable ou non sur les achats).
2. Saisir le **solde d'ouverture** de chaque compte (caisse, banques, mobile money) à la date de démarrage.
3. Saisir les **charges fixes mensuelles** (salaires, loyer, CNSS, abonnements…).
4. Renseigner les **destinataires du rapport hebdomadaire** et les variables d'envoi (voir README, mise en production).

## Limites connues

- Le résultat est un résultat **de gestion** (mensuel, sans amortissements, provisions ni écritures d'inventaire) : la comptabilité
  générale et les états financiers SYSCOHADA restent faits par le comptable à partir des exports.
- Les règlements fournisseurs depuis un compte en USD sont convertis au taux du jour ; les écarts de change ne sont pas comptabilisés.
- Les avoirs fournisseurs ne sont pas gérés (corriger une facture avant son premier règlement, ou saisir un mouvement divers).
- L'envoi d'e-mails dépend d'un service externe (Resend) à configurer ; sans lui, le rapport reste consultable dans Direction → Rapport.

## Synthèse du projet (phases 1 à 3)

Chaîne complète couverte : achat et conteneurs → stock → production → qualité → livraison → vente → encaissement → finance → pilotage,
pour 11 rôles dont les droits sont appliqués **en base**, avec une application commerciale hors ligne, des listes de référence
modifiables par les équipes (principe « Odoo ») et un journal d'audit de toutes les modifications.
