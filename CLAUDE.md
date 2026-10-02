# CLAUDE.md — Papel ERP

ERP de **Papel Industries**, fabricant guinéen de mouchoirs en papier (usine de Coyah, Guinée).
Chaîne couverte : achat MP → stock → production → stock produits finis → distribution → vente → encaissement → pilotage.

> Ce fichier est la référence des règles métier et des conventions de code. Le tenir à jour à chaque phase.
> État : **Phase 1 (MVP) livrée** (bilan : `docs/bilan-phase-1.md`). En cours : **phase 2** (achats, logistique, qualité, maintenance). Plan : `docs/architecture.md`.

@AGENTS.md

**Next.js 16** : `middleware` s'appelle désormais `proxy` (`src/proxy.ts`) ; `cookies()`, `params`, `searchParams` sont asynchrones.
Lire `node_modules/next/dist/docs/` avant d'utiliser une API Next inconnue.

Commandes : `npm run verifier` (types + lint + Vitest), `npm run test:db` (pgTAP), `npm run test:e2e` (Playwright),
`npm run db:reset` (migrations + seed), `npm run test:e2e:complet` (base neuve + build + serveur + Playwright), `npm run db:types` (régénère `src/lib/supabase/types.ts` après chaque migration).

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
- Migrations SQL versionnées (`supabase/migrations`), configuration initiale (`supabase/donnees-initiales.sql`) et démo (`supabase/seed-demo.sql`).
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
- **Prix, TVA et paramètres commerciaux : saisis par la direction elle-même dans l'interface** (valeurs de départ ci-dessous, modifiables).
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
  - Clients éligibles : colonne `dotation` du **type de client** (table `types_clients`, modifiable ; grossistes par défaut).
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

## 6 ter. Production (étape 3)

- Listes modifiables (Production → Listes de référence) : postes (heures, un poste peut passer minuit), équipes, opérateurs
  (sans compte informatique), lignes, **cadences nominales** (paquets/min par ligne × produit, nécessaires au TRS),
  causes d'arrêt (**planifié** : pause, nettoyage prévu → réduit le temps d'ouverture ; **non planifié** → réduit la disponibilité), campagnes.
- Ordre de fabrication (OF) : produit × conditionnement, quantité visée en **colis**, numéro automatique `OF-AAAA-NNNN` ;
  avancement = paquets des fiches validées rattachées à l'OF.
- Fiche de poste : une par (jour × poste × ligne). Production saisie en **colis complets + paquets en vrac** (conversion par `unites.ts`),
  rebuts en kg, bobines consommées (lot + kg), emballages, arrêts (cause + durée), opérateurs présents. Durée du poste figée à la création.
- **Validation** (`valider_fiche_production`, atomique) : sorties des consommations au CMP, entrée des produits finis au **coût de revient
  matière** (coût des consommations réparti au prorata du poids théorique de papier : paquets × poids d'un paquet). Fiche validée = figée.
  Les rebuts ne font pas de mouvement : leur papier est déjà dans les kg consommés.
- Indicateurs (`src/lib/metier/production.ts`, testés) :
  - ratio rendement = Σ(paquets ÷ rendement théorique du produit) ÷ tonnes consommées (= réel/théorique pour un seul produit) ;
  - rendement réel par produit (paquets/t) calculé sur les fiches mono-produit ;
  - taux de perte = rebuts kg ÷ papier kg ;
  - TRS = disponibilité × performance × qualité (rebuts convertis en paquets via le poids d'un paquet) ; non calculé sans cadence.
  - Agrégation sur une période = concaténation des fiches (pas de moyenne de pourcentages).
- Périodes d'analyse et période précédente de même durée : `src/lib/formulaires/periode.ts`.
- Graphiques : Recharts, palette catégorielle validée (`src/components/graphiques/production.tsx`), ordre de couleur fixe.

## 6 quater. Ventes (étape 4)

- Listes modifiables : **types de clients** (niveau de prix appliqué, dotation oui/non), **modes de paiement**.
- Clients : code automatique `CL-NNNNN`, comptant ou crédit (délai, **plafond** : une facture qui le ferait dépasser est refusée).
- **Pièces de vente** (une seule table, comme Odoo) : devis → commande → facture ; facture → avoir. Lignes en colis + paquets en vrac,
  **prix HT au paquet figé** à la création (grille en vigueur pour le niveau de prix du type de client, sinon prix Papel).
- Validation (`valider_piece`) : numéro **continu sans trou** par type et par an (`DEV-`, `CMD-`, `FA-`, `AV-AAAA-NNNNN`, table `compteurs`),
  TVA sur le total HT (un arrondi), échéance = date + délai du client. Pièce validée = figée (correction par avoir).
- Livraison (bon `BL-`) : depuis une commande validée, partielle possible ; validation = sorties de stock « vente » (stock insuffisant → refus).
- Paiements **saisis au bureau uniquement** (rôle finance) via `enregistrer_paiement` : refus au-delà du reste dû ; recalcul de la dotation.
- Dotation (`calculer_dotation_facture`, même méthode que `dotation.ts`, part payée calculée sur le TTC) ; remise physique
  (`remettre_dotation`) = sortie de stock « dotation » dans le même produit.
- Avoir (`valider_avoir`) : reprend les lignes de la facture (quantités ajustables), remet les paquets en stock (« retour »), ne peut pas dépasser le reste dû.
- Impayés : tranches d'ancienneté, relances (canal, compte rendu, promesse de paiement).
- Indicateurs (`src/lib/ventes/indicateurs.ts`) : CA HT (factures − avoirs), volumes paquets/colis, prix moyen, commandes, clients actifs,
  nouveaux clients, encaissements, créances, échu, **DSO** = créances ÷ CA TTC × jours (`src/lib/metier/ventes.ts`).
- Documents imprimables (facture, devis, avoir, bon de livraison) avec **montant en lettres** (`nombreEnLettres`, orthographe rectifiée) ;
  « Imprimer / enregistrer en PDF » via le navigateur (pas de dépendance PDF lourde).
- Après une validation qui fige la page, l'action redirige avec `?succes=` (bandeau `BandeauSucces`, helper `avecSucces`).
- Messages d'erreur SQL : nombres formatés à la française avec `public.nombre_fr()`.

## 6 quinquies. Terrain hors ligne et supervision (étape 5)

- Application `/terrain` = **une seule page client** (navigation interne par `#`, bouton retour Android) qui lit tout dans
  **IndexedDB** (`src/lib/terrain/base-locale.ts`, Dexie, une base par utilisateur). Aucune requête serveur n'est nécessaire hors ligne.
  IndexedDB n'indexe pas les booléens : filtrer en JS (`enAttente`, `envoyee`).
- **Service worker** `public/sw.js` (enregistré en production) : `/terrain` réseau d'abord puis cache ; `/_next/static` cache d'abord ;
  tuiles de carte en cache limité. Manifeste `src/app/manifest.ts` (installable, démarre sur `/terrain`).
- Saisies hors ligne → file `operations` (UUID générés sur le téléphone) → RPC **`synchroniser_terrain`** (lots de 50, chaque opération
  isolée dans un sous-bloc : une erreur n'arrête pas le lot ; renvoi idempotent « deja »). Types : `pva`, `visite`, `photo`, `client`, `piece`.
  Synchro au démarrage, au retour du réseau (`online`), toutes les 5 min et après chaque saisie (`src/lib/terrain/synchronisation.ts`).
- **Check-in GPS** : distance au PVA par PostGIS (`controler_checkin`) ; `dans_zone` = distance ≤ `gps_rayon_checkin_m` ET précision ≤
  `gps_precision_max_m` ; visite hors zone enregistrée mais signalée ; un PVA sans position prend celle de sa 1re visite précise.
  Même règle côté téléphone pour l'information immédiate (`src/lib/terrain/geo.ts`). Visites inaltérables.
- **Devis et factures hors ligne** : numéro dans la **série du commercial** (`profils.code_serie`, ex. `FA-2026-C01-00012`), compteur local
  jamais réutilisé, réaligné à chaque synchro (`dernier_numero_terrain`). Le serveur refuse un numéro hors série
  (`controler_numero_terrain`) et un **prix différent de la grille** (`controler_prix_terrain`). Une pièce refusée reste visible
  « Refusé » avec le motif. Le téléphone bloque une facture qui dépasserait le plafond de crédit connu.
- Photos : compression JPEG ≤ 1 280 px (`src/lib/terrain/image.ts`) → Storage privé `photos-terrain/<id commercial>/<pva>/…`.
- Responsable commercial (`/commercial`) : carte des PVA (couleur fixe par commercial, point creux = rupture), indicateurs (visites/jour,
  hors zone, taux de rupture, nouveaux PVA, couverture quartiers/communes, CA par commercial vs objectif), visites et positions des check-ins
  par jour, tournées (`tournees`, `tournee_etapes`) et objectifs mensuels (`objectifs_commerciaux`).
- Carte : Leaflet (`src/components/carte/carte.tsx`, chargée côté navigateur via `CarteDynamique`), tuiles `NEXT_PUBLIC_TUILES_URL`
  (OpenStreetMap par défaut ; prendre un fournisseur de tuiles en production).
- Palette catégorielle partagée : `src/lib/graphiques/couleurs.ts` (jamais importer une constante depuis un fichier « use client » côté serveur).

## 6 sexies. Tableau de bord Direction (étape 6)

- `src/lib/direction/synthese.ts` assemble les indicateurs des modules (réutilise `chargerIndicateursVentes`, `chargerFiches`/`agreger`,
  `chargerIndicateursCommerciaux`, `etat_stock`) pour la période ET la période précédente de même durée.
- Marge brute = CA HT − coût matière des produits vendus (mouvements `vente` + `dotation` − `retour`, valorisés au CMP).
- Alertes prioritaires : stock (rupture, sous seuil, couverture faible), fiches de production en alerte (veille et jour), impayés > 30 j,
  taux de rupture terrain > 15 %. Triées : critiques d'abord.
- Export PDF = impression du navigateur (CSS `@media print`, cartes masquées) ; rapport hebdomadaire `/direction/rapport`.

## 6 septies. Achats et conteneurs (phase 2 – étape 1)

- Listes modifiables : fournisseurs (devise habituelle), **types de frais d'approche** (fret, transit, douane, transport…), **types de documents**.
- **Demande d'achat** (`DA-AAAA-NNNNN`) : émise par le magasin, la production, la maintenance ou les achats (`/<espace>/demandes`,
  composant `MesDemandes`) ; le demandeur voit les siennes ; les achats approuvent ou refusent, puis la rattachent à un bon de commande.
- **Bon de commande** : brouillon modifiable → `envoyer_bc` (numéro `BC-`, **taux USD du jour figé**, demandes liées « commandée »).
  Lignes saisies en tonnes possible pour un article au kg (conversion `unites.ts`) ; montant de ligne calculé par la base (USD en centimes).
- **Conteneur** : dates prévues et réelles (embarquement, port, dédouanement, livraison) ; **statut déduit des dates réelles**.
  Frais d'approche en GNF ou USD (taux à la date du frais, `montant_gnf` calculé par la base).
- **Coût de revient** (vue `couts_conteneurs`, fonctions pures `src/lib/metier/achats.ts`) = (marchandise au prorata du poids + frais)
  ÷ **poids net déclaré** (packing list ; stable pendant une réception partielle) ; comparé au coût prévu (frais estimés du BC).
- Réception : `receptionner_bobine_conteneur` (Magasin → Bobines, choix du conteneur) → lot au coût de revient complet, fournisseur du BC.
- Transit (vue `transit`) : kg des conteneurs non livrés, affiché dans les tableaux de bord Magasin et Direction.
- Documents (facture, BL, packing list…) : Storage privé `documents-achats/<objet>/<id>/…`, lien de téléchargement signé 5 min.

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
