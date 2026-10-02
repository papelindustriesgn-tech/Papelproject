# CLAUDE.md — Papel ERP

ERP de **Papel Industries**, fabricant guinéen de mouchoirs en papier (usine de Coyah, Guinée).
Chaîne couverte : achat MP → stock → production → stock produits finis → distribution → vente → encaissement → pilotage.

> Ce fichier est la référence des règles métier et des conventions de code. Le tenir à jour à chaque phase.
> État : **Phase 1 — étapes 1 (fondations) et 2 (stocks) livrées.** Prochaine : étape 3 (production). Plan : `docs/architecture.md`.

@AGENTS.md

**Next.js 16** : `middleware` s'appelle désormais `proxy` (`src/proxy.ts`) ; `cookies()`, `params`, `searchParams` sont asynchrones.
Lire `node_modules/next/dist/docs/` avant d'utiliser une API Next inconnue.

Commandes : `npm run verifier` (types + lint + Vitest), `npm run test:db` (pgTAP), `npm run test:e2e` (Playwright),
`npm run db:reset` (migrations + seed), `npm run db:types` (régénère `src/lib/supabase/types.ts` après chaque migration).

---

## 0. Principe directeur : un ERP paramétrable « à la Odoo »

**Les équipes de Papel saisissent et modifient elles-mêmes leurs données : rien n'est figé dans le code.**
- Toute liste métier (niveaux de prix, villes/communes/quartiers, catégories d'articles, fournisseurs, puis causes d'arrêt,
  marques concurrentes, types de clients…) est une **table** éditable dans l'interface — jamais un `enum` SQL ni une constante TS.
  Exceptions assumées : les codes qui pilotent une logique du code (rôles, familles d'articles, unités, types de mouvement).
- Nouvelle liste simple → la déclarer dans `src/lib/referentiels/definitions.ts` : la page générique `/<espace>/listes/<code>`
  fournit recherche, ajout, modification, archivage (ou suppression si inutilisée) et export Excel.
- Écrans de liste : recherche + filtres dans l'URL (`BarreFiltres`), **export Excel** (`ExportCsv` : CSV « ; » + BOM).
- On **archive** (`actif = false`) plutôt que supprimer ce qui a servi ; les historiques (prix, mouvements, audit) sont inaltérables.
- Données : `supabase/donnees-initiales.sql` = configuration de départ (chargée aussi en production, puis modifiée dans l'interface) ;
  `supabase/seed-demo.sql` = démonstration locale uniquement (comptes à mot de passe connu, stocks fictifs).

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
- Le nombre de paquets par colis dépend du **conditionnement** (table `conditionnements`) : on ne code jamais « 50 » ou « 30 » en dur.

## 4. Produits (paramétrables dans Admin)

| Produit   | Mouchoirs | Plis | Format (mm) | Conditionnements (paquets / colis) | Rendement théorique | Prix Papel actuel |
|-----------|-----------|------|-------------|------------------------------------|---------------------|-------------------|
| Petit 100 | 100       | 3    | 190 × 126   | 50 (défaut), 80 ou 100 selon le client | 10 175 paquets/t | **3 400 GNF / paquet** |
| Grand 100 | 100       | 3    | 190 × 197   | 30                                 | 6 508 paquets/t     | **7 666 GNF / paquet** |

- **Le prix est fixé AU PAQUET, identique quelle que soit la taille du colis** (confirmé par la direction).
  Prix du colis = prix du paquet × paquets du conditionnement (ex. Petit colis de 50 = 170 000 GNF HT ; Grand colis de 30 = 229 980 GNF HT).
- **Prix HORS TAXES ; TVA 18 % AJOUTÉE sur la facture** (paramètres `tva_applicable` = oui, `tva_taux` = 18 %), calculée sur le total HT
  avec un seul arrondi (`src/lib/metier/tva.ts`). À valider avec le comptable selon le régime fiscal de Papel.

- Grammage de référence : **13 g/m² par pli**. Pertes de référence : **5 %**.
- Formule du rendement théorique (vérifie les valeurs ci-dessus) :
  `poids_paquet_g = (L_m × l_m) × plis × grammage × nb_mouchoirs`
  `rendement_theorique = arrondi(1 000 000 g × (1 − taux_perte) ÷ poids_paquet_g)` (arrondi à l'entier le plus proche)
  Formule implémentée deux fois, à l'identique : `src/lib/metier/rendement.ts` et colonne générée `produits.rendement_theorique_paquets_t`.
  - Petit : 0,190 × 0,126 × 3 × 13 × 100 = 93,366 g → 950 000 ÷ 93,366 = 10 174,98 → **10 175 paquets/t**
  - Grand : 0,190 × 0,197 × 3 × 13 × 100 = 145,977 g → 950 000 ÷ 145,977 = 6 507,88 → **6 508 paquets/t**
- Le système compare **toujours** le rendement RÉEL (paquets produits ÷ tonnes consommées) au théorique.
- **Historique des prix conservé** : un prix a une date de début et une date de fin, jamais écrasé (table `grille_prix`, fonction `definir_prix`, contrainte anti-chevauchement, trigger d'immuabilité).

## 5. Distribution et prix

- Chaîne : Papel → grossiste → semi-grossiste → détaillant (PVA) → consommateur.
- Niveaux de prix (table `niveaux_prix`, modifiable ; `papel` obligatoire) — Petit 100, prix au paquet :
  Papel → grossiste **3 400** ; grossiste → semi-grossiste **3 600 max** ; semi-grossiste → détaillant **4 000** ; détaillant → consommateur **5 000**.
  Prix conseillés du Grand 100 : non communiqués (à saisir dans l'interface).
- **Dotation** : 4 paquets offerts pour 100 achetés (paramètre `taux_dotation`, **4 %** par défaut), du **même produit**,
  calculée **uniquement sur les montants encaissés** (jamais sur le facturé non payé).
  - Clients éligibles : paramètre `dotation_types_eligibles` (grossistes par défaut ; B2B activable).
  - Calcul cumulatif (`src/lib/metier/dotation.ts`) : paiements partiels sans perte ni doublon ; remise en colis complets, le reste reporté.
- **Commerciaux terrain** : font des **devis et factures** depuis leur téléphone (hors ligne). Ils **n'encaissent pas** :
  aucun encaissement n'est saisi par le terrain ; les paiements sont enregistrés au bureau (finance).
- Site unique : **usine de Coyah** (pas de dépôt). Stock suivi **en temps réel** (chaque entrée/sortie est un mouvement).

## 6. Coûts

- Coût matière réel = prix fournisseur + fret + transit + douane + transport jusqu'à l'usine + pertes.
- Postes de coûts variables : pâte/bobines, films, sacs, boîtes, cartons, encres, transport, douane.
- Charges fixes mensuelles saisies séparément.

## 6 bis. Stocks (étape 2)

- Site unique (Coyah) : pas d'emplacements. Stock **temps réel** = somme des mouvements, tenu dans `stocks_articles` / `stocks_lots` par trigger.
- `mouvements_stock` : journal **inaltérable** (ni UPDATE ni DELETE) ; quantité **signée** dans l'unité de l'article (imposée par la base) ;
  le type impose le signe ; motif obligatoire pour sortie diverse, rebut, ajustement. Erreur → mouvement inverse.
- Stock négatif refusé (verrou de ligne + contrôle). Bobines : article `suivi_par_lot` (kg) → lot obligatoire ; une bobine bloquée ne sort pas.
- Valorisation au **coût moyen pondéré** : entrée au coût saisi (sinon coût du lot, sinon CMP) ; sortie au CMP ; stock à zéro → valeur à zéro.
  Produits finis valorisés à 0 tant que le coût de revient de production n'existe pas (étape 3).
- Produits finis : un article par (produit × conditionnement), créé automatiquement, stocké en **paquets**, affiché « paquets (colis) ».
- Unité, famille et suivi par lot d'un article sont **définitifs** (sinon créer un nouvel article).
- Jours de couverture = stock ÷ (sorties consommation/vente/sortie/dotation/rebut des N derniers jours ÷ N), N = `stock_periode_consommation_jours`.
- Inventaire : photo du théorique à l'ouverture, comptage, validation → un mouvement « inventaire » par écart.
- Écritures sensibles par fonctions SQL atomiques : `receptionner_bobine`, `ouvrir_inventaire`, `valider_inventaire`.

## 7. Seuils d'alerte (paramétrables)

- Production : rendement < **95 %** du théorique ; perte > **5 %** ; arrêt > **30 min**.
- Stock : seuil mini par article ; jours de couverture = stock ÷ consommation moyenne journalière.
- Maintenance : pièces critiques sous le seuil.

## 8. Rôles (chaque rôle ne voit QUE son interface)

Connexion par **identifiant + mot de passe** (e-mail technique `identifiant@papel.local`, pas de SMS). Comptes créés uniquement par l'admin
ou la Direction (inscription publique désactivée). Un téléphone par commercial.

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

- Droits appliqués **en base (RLS)**, pas seulement dans l'interface. Fonctions : `a_role(r)`, `a_un_role(...)` (inclut toujours la Direction), `est_admin()`, `est_actif()`.
  Un compte désactivé perd tous ses droits. Seule la Direction attribue le rôle Direction.
- Les rôles sont aussi copiés dans le jeton (claim `papel_roles`, hook `hook_jeton_acces`) pour les redirections du proxy ; l'autorité reste la table `utilisateur_roles`.
- Espaces et rôles autorisés : `src/lib/auth/espaces.ts`. Chaque espace a un `layout.tsx` qui appelle `exigerEspace()`.
- **Journal d'audit** de toutes les modifications (qui, quoi, quand, avant/après) : table `journal_audit` en ajout seul ;
  toute nouvelle table métier doit appeler `select public.activer_audit('public.ma_table');` dans sa migration.

## 9. Conventions de code

- Montants : entiers (`bigint`) — GNF en unités, USD en **centimes**. Jamais de `float` pour l'argent.
- Calculs métier critiques (rendement, unités, coûts, marges, dotations, devises) : fonctions pures dans `src/lib/metier/`, **testées** (Vitest).
- Validation des formulaires avec Zod, messages d'erreur en français.
- Identifiants UUID générés côté client pour tout ce qui peut être créé hors ligne (synchronisation idempotente).
- Tests RLS en SQL (pgTAP, `supabase/tests/`), parcours critiques en Playwright (`e2e/`, écran mobile 360 px).
- Server Actions : valider avec Zod, renvoyer un `EtatFormulaire` (`src/lib/formulaires/etat.ts`), traduire les erreurs SQL avec `messageErreurBase`.
- Nombres saisis à la française (« 9 450 », « 0,05 ») : `lireNombre()` ; pourcentages saisis en % et stockés en fraction (5 → 0,05).
- Interface : composants `src/components/ui`, boutons ≥ 44 px, police système (aucune police téléchargée), couleur marque `papel-700` = #07524D.
- Comptabilité : le comptable suivra très probablement le **SYSCOHADA** ; prévoir des exports **Excel/CSV** compatibles (phase 3).

## 10. Phases

- **Phase 1 (MVP)** : auth et rôles, paramètres, stocks, production, application commerciale PVA (hors ligne + GPS), ventes simples, tableau de bord Direction.
- **Phase 2** : achats et conteneurs, logistique, qualité, maintenance.
- **Phase 3** : finance complète, trésorerie prévisionnelle, rapports automatiques, exports comptables.
