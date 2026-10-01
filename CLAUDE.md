# CLAUDE.md — Papel ERP

ERP de **Papel Industries**, fabricant guinéen de mouchoirs en papier (usine de Coyah, Guinée).
Chaîne couverte : achat MP → stock → production → stock produits finis → distribution → vente → encaissement → pilotage.

> Ce fichier est la référence des règles métier et des conventions de code. Le tenir à jour à chaque phase.
> État : **Phase 0 — cadrage** (architecture proposée dans `docs/architecture.md`, en attente de validation).

---

## 1. Stack

- Next.js (App Router) + TypeScript strict + Tailwind CSS. Interface **en français**.
- Supabase : PostgreSQL, Auth, Storage (photos), RLS (droits), PostGIS (géolocalisation).
- Hébergement Vercel. Graphiques Recharts. Exports Excel et PDF.
- Application commerciaux : PWA Android installable, **hors ligne**, synchronisation automatique.
- Migrations SQL versionnées (`supabase/migrations`), données de démo (`supabase/seed.sql`).
- Code commenté en français.

## 2. Contraintes Guinée

- **Devise principale : GNF** (pas de décimales). Achats souvent en **USD**.
  - Chaque opération en devise stocke : `devise`, `montant`, `taux_change` **à la date de l'opération**, `montant_gnf`.
  - Taux par défaut : **9 450 GNF/USD**, modifiable dans Admin, historisé par date.
- **Fuseau horaire : Africa/Conakry** (UTC+0, sans heure d'été). Stockage en `timestamptz`, affichage et « date métier » calculés en Africa/Conakry.
- Mobile d'abord : Android d'entrée de gamme, faible bande passante → pages légères, images compressées côté client avant envoi.

## 3. Unités — règle absolue

Unités : **tonne, kg, bobine jumbo, paquet, colis, carton, palette**. On ne les mélange **JAMAIS**.

- Toutes les conversions passent par **un seul module** : `src/lib/metier/unites.ts` (facteurs lus depuis la table de paramètres produits).
- Types TypeScript « marqués » (`Tonnes`, `Kg`, `Paquets`, `Colis`…) : additionner des colis et des paquets ne compile pas.
- En base, chaque quantité a une unité explicite (nom de colonne suffixé : `quantite_paquets`, `poids_kg`…).
- Unité de stockage de référence : MP en **kg**, produits finis en **paquets** (le colis est une vue dérivée).

## 4. Produits (paramétrables dans Admin)

| Produit   | Mouchoirs | Plis | Format (mm) | Paquets / colis | Rendement théorique | Prix distributeur actuel |
|-----------|-----------|------|-------------|-----------------|---------------------|--------------------------|
| Petit 100 | 100       | 3    | 190 × 126   | 50              | 10 175 paquets/t    | 175 000 GNF / colis      |
| Grand 100 | 100       | 3    | 190 × 197   | 30              | 6 508 paquets/t     | 230 000 GNF / colis      |

- Grammage de référence : **13 g/m² par pli**. Pertes de référence : **5 %**.
- Formule du rendement théorique (vérifie les valeurs ci-dessus) :
  `poids_paquet_g = (L_m × l_m) × plis × grammage × nb_mouchoirs`
  `rendement_theorique = 1 000 000 g × (1 − taux_perte) ÷ poids_paquet_g`
  - Petit : 0,190 × 0,126 × 3 × 13 × 100 = 93,37 g → 10 710 × 0,95 ≈ **10 175 paquets/t**
  - Grand : 0,190 × 0,197 × 3 × 13 × 100 = 145,98 g → 6 850 × 0,95 ≈ **6 508 paquets/t**
- Le système compare **toujours** le rendement RÉEL (paquets produits ÷ tonnes consommées) au théorique.
- **Historique des prix conservé** : un prix a une date de début et une date de fin, jamais écrasé.

## 5. Distribution et prix

- Chaîne : Papel → grossiste → semi-grossiste → détaillant (PVA) → consommateur.
- Prix conseillés par niveau (grille de prix par niveau, historisée).
- **Dotation grossiste** : X colis offerts pour 100 achetés (paramétrable, **4 %** par défaut), calculée **uniquement sur les montants encaissés** (jamais sur le facturé non payé).

## 6. Coûts

- Coût matière réel = prix fournisseur + fret + transit + douane + transport jusqu'à l'usine + pertes.
- Postes de coûts variables : pâte/bobines, films, sacs, boîtes, cartons, encres, transport, douane.
- Charges fixes mensuelles saisies séparément.

## 7. Seuils d'alerte (paramétrables)

- Production : rendement < **95 %** du théorique ; perte > **5 %** ; arrêt > **30 min**.
- Stock : seuil mini par article ; jours de couverture = stock ÷ consommation moyenne journalière.
- Maintenance : pièces critiques sous le seuil.

## 8. Rôles (chaque rôle ne voit QUE son interface)

1. Direction (PDG, DG) — accès total + tableau de bord global
2. Achats et approvisionnement
3. Magasin (magasinier)
4. Production (chef de production, opérateurs)
5. Maintenance (techniciens)
6. Qualité (QHSE)
7. Commercial terrain (PWA mobile) — ne voit que **ses** PVA, visites, commandes
8. Responsable commercial — voit tous les commerciaux
9. Logistique et livraison (chauffeurs)
10. Comptabilité et finance
11. Administrateur système — utilisateurs, rôles, paramètres

- Droits appliqués **en base (RLS)**, pas seulement dans l'interface.
- **Journal d'audit** de toutes les modifications (qui, quoi, quand, avant/après).

## 9. Conventions de code

- Montants : entiers (`bigint`) — GNF en unités, USD en **centimes**. Jamais de `float` pour l'argent.
- Calculs métier critiques (rendement, unités, coûts, marges, dotations, devises) : fonctions pures dans `src/lib/metier/`, **testées** (Vitest).
- Validation des formulaires avec Zod, messages d'erreur en français.
- Identifiants UUID générés côté client pour tout ce qui peut être créé hors ligne (synchronisation idempotente).
- Tests RLS en SQL (pgTAP), parcours critiques en Playwright.

## 10. Phases

- **Phase 1 (MVP)** : auth et rôles, paramètres, stocks, production, application commerciale PVA (hors ligne + GPS), ventes simples, tableau de bord Direction.
- **Phase 2** : achats et conteneurs, logistique, qualité, maintenance.
- **Phase 3** : finance complète, trésorerie prévisionnelle, rapports automatiques, exports comptables.
