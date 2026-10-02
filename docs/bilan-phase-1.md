# Bilan de la phase 1 (MVP) — Papel ERP

Date : 02/10/2026. Branche : `claude/cadrage-architecture`.

## Livré

| Étape | Contenu |
|---|---|
| 1. Fondations | Connexion par identifiant, 11 rôles, droits en base (RLS) sur toutes les tables, journal d'audit inaltérable, paramètres, taux de change historisés, produits et prix historisés, calculs métier testés |
| 2. Stocks | Articles, bobines jumbo par lot, mouvements inaltérables, coût moyen pondéré, inventaires, jours de couverture, alertes ; listes de référence modifiables (principe « Odoo ») |
| 3. Production | Fiches de poste (matin, après-midi, nuit), ordres de fabrication, rendement réel/théorique, pertes, arrêts par cause, TRS, alertes, coût de revient des produits finis |
| 4. Ventes | Clients, devis → commande → livraison → facture TTC → paiement, dotation sur l'encaissé, avoirs, impayés et relances, documents imprimables avec montant en lettres, DSO |
| 5. Terrain | Application Android installable et hors ligne : PVA, check-in GPS contrôlé, photos, prix et concurrence, devis et factures numérotés hors ligne, synchronisation ; supervision du responsable commercial (carte, visites, tournées, objectifs) |
| 6. Direction | Tableau de bord 5 domaines avec comparaison à la période précédente, alertes prioritaires du jour, carte de couverture, export PDF, rapport hebdomadaire imprimable |

## Qualité

- Tests de calcul (Vitest) : unités, rendement, TRS, coûts, TVA, dotation, devises, prix, montants en lettres, DSO, marge, périodes, GPS, numérotation.
- Tests de droits et de règles en base (pgTAP) : RLS par rôle, audit, stock négatif refusé, CMP, fiches figées, ventes, synchronisation terrain.
- Parcours de bout en bout (Playwright, écran de téléphone 360 px), dont le travail complet **hors ligne** puis la synchronisation.
- Commande unique : `npm run verifier` puis `npm run test:db` et `npm run test:e2e:complet`.

## Ce que l'équipe Papel doit saisir avant la mise en service

1. Paramètres de l'entreprise (NIF, RCCM, adresse, téléphone) et confirmation TVA avec le comptable.
2. Prix conseillés du Grand 100 (Administration → Produits et prix).
3. Cadences nominales de la ligne (Production → Listes → Cadences) pour le TRS.
4. Opérateurs, fournisseurs, articles d'emballage, seuils d'alerte.
5. Comptes utilisateurs et série de numérotation de chaque commercial (C01, C02…).

## Limites connues (traitées en phases 2 et 3)

- « Tonnes en transit » : avec le module Achats (phase 2).
- Charges fixes, résultat, trésorerie, BFR, dettes fournisseurs : phase 3.
- Envoi automatique du rapport hebdomadaire par e-mail : phase 3.
- Fond de carte : prévoir un fournisseur de tuiles en production (variable `NEXT_PUBLIC_TUILES_URL`).
