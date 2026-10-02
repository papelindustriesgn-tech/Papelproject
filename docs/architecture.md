# Papel ERP — Architecture

> Validée le 01/10/2026 avec les réponses de la direction (voir § 6).

## 1. Vue d'ensemble

```
 Android (PWA terrain)        Navigateur bureau (rôles usine/siège)
   │  IndexedDB (Dexie)              │
   │  file d'attente "outbox"        │
   └────────────┬────────────────────┘
                │ HTTPS
        Next.js sur Vercel (App Router, Server Components, Server Actions)
                │ supabase-js (JWT de l'utilisateur → RLS appliquée)
        Supabase : PostgreSQL + PostGIS + RLS + Auth + Storage
                │ pg_cron : alertes, agrégats nuit, rapport hebdo (phase 3)
```

Une seule application Next.js, découpée en **espaces par rôle** (route groups) :

```
src/app/
  (auth)/connexion
  direction/       tableau de bord global
  magasin/         stocks, mouvements, inventaires
  production/      OF, fiches de poste, KPI
  terrain/         PWA commerciale (hors ligne) — manifest + service worker limités à ce scope
  commercial/      responsable commercial : carte, équipe, visites
  ventes/          clients, commandes, factures, paiements
  achats/  logistique/  qualite/  maintenance/   (phase 2)
  finance/                                      (phase 3)
  admin/           utilisateurs, rôles, paramètres, journal d'audit
src/lib/metier/    calculs purs testés : unites, rendement, couts, marges, dotation, devises, kpi
src/lib/sync/      moteur hors ligne (outbox, pull delta, photos)
supabase/migrations, supabase/seed.sql, supabase/tests (pgTAP)
```

Le middleware redirige chaque utilisateur vers son espace ; un utilisateur n'a accès qu'aux espaces de ses rôles. **La vraie barrière est la RLS** : même un appel API direct ne renvoie que les lignes autorisées.

## 2. Choix techniques

| Sujet | Choix | Raison |
|---|---|---|
| Hors ligne | Service worker **Serwist** + **Dexie** (IndexedDB) + outbox | Mature, léger, compatible App Router |
| Synchro | UUID générés côté client, `upsert` idempotents via RPC `sync_pousser(lot jsonb)`, pull par `updated_at > dernier_curseur` | Rejouable sans doublon si le réseau coupe en plein envoi |
| Conflits | Visites, commandes, encaissements = **ajout seul** (pas de conflit). Fiche PVA : dernier écrit gagne + audit. Référentiels (produits, prix) : serveur gagne | Simple et prévisible |
| Photos | Compression client (≤ 1280 px, JPEG/WebP ~150 Ko), file d'envoi séparée, Storage privé | Bande passante faible |
| GPS | `navigator.geolocation` haute précision ; check-in valide si distance PVA ≤ rayon paramétrable (100 m par défaut) et précision ≤ 50 m ; sinon visite marquée « hors zone » (pas bloquée) | Détecte la fraude sans bloquer le terrain |
| Cartes | **Leaflet** + tuiles OSM (fournisseur à confirmer), mise en cache des tuiles déjà vues | Léger sur Android d'entrée de gamme |
| Formulaires | react-hook-form + Zod, messages FR | |
| Graphiques | Recharts | demandé |
| Exports | **ExcelJS** (xlsx), **@react-pdf/renderer** (PDF) | |
| Tests | Vitest (calculs), pgTAP (RLS, triggers), Playwright (parcours) | |
| Dates | `timestamptz` en base, affichage `Africa/Conakry` (date-fns-tz) | |
| Argent | `bigint` : GNF entiers, USD en centimes ; taux stocké sur chaque opération | Pas d'erreur d'arrondi |

## 3. Sécurité et audit

- `profils` (1 par utilisateur Auth) + `utilisateur_roles` (un utilisateur peut cumuler des rôles).
- Fonctions SQL `security definer stable` : `a_role('magasin')`, `est_direction()`, `est_admin()`.
- RLS activée sur **toutes** les tables métier. Exemples :
  - `pva`, `visites` : commercial terrain → `commercial_id = auth.uid()` ; responsable commercial et direction → tout.
  - `mouvements_stock` : magasin (lecture/écriture), production (écriture des consommations), direction (lecture).
  - `parametres` : lecture tous, écriture admin seulement.
- Écritures sensibles (validation d'une fiche de production, mouvement de stock, paiement) via **fonctions RPC transactionnelles** qui contrôlent les règles (stock non négatif, unités cohérentes).
- Trigger générique `audit.journaliser()` sur toutes les tables : table, id, opération, `avant`/`apres` (jsonb), utilisateur, horodatage. Table en ajout seul (ni UPDATE ni DELETE possibles).
- Documents « figés » (facture validée, fiche de production clôturée) : non modifiables, correction par avoir / ajustement.

## 4. Schéma de base de données

### 4.1 Socle (phase 1)
- `profils` (id = auth.users.id, nom, prénom, téléphone, actif)
- `roles` (code, libellé) · `utilisateur_roles` (utilisateur_id, role_code)
- `parametres` (clé, valeur jsonb, description) — taux de perte, seuils d'alerte, rayon GPS, % dotation…
- `taux_change` (date, devise, taux_gnf) — historisé
- `audit.journal`
- Géographie : `villes`, `communes`, `quartiers`

### 4.2 Référentiel produits et unités
- `articles` (id, code, libellé, **famille** : matiere_premiere | emballage | produit_fini | piece_detachee, **unite_stock** : kg | unite | paquet, seuil_alerte, actif)
- ✅ `produits` (code, nb_mouchoirs, plis, longueur_mm, largeur_mm, grammage_g_m2_pli, taux_perte_ref, poids_paquet_g et rendement_theorique_paquets_t **calculés**)
- ✅ `conditionnements` (produit, paquets_par_colis : 50/80/100 pour le Petit, 30 pour le Grand, colis_par_palette)
- ✅ `grille_prix` (produit, niveau : papel | grossiste | semi_grossiste | detaillant, **prix_paquet_gnf**, date_debut, date_fin) — historique sans chevauchement
- Étape 2 : un article produit fini par (produit × conditionnement), stocké en paquets

### 4.3 Stocks (✅ livré — voir migration `20261002000300_stocks.sql`)
- Site unique : pas de table d'entrepôts. `categories_articles`, `fournisseurs` (listes modifiables), `articles`, `lots`,
  `mouvements_stock` (signé, inaltérable), `stocks_articles` / `stocks_lots` (temps réel, CMP), `inventaires`, vues `etat_stock`, `etat_lots`, `alertes_stock`.
- Ancienne proposition, pour mémoire :
- `entrepots` (usine Coyah MP, magasin PF, dépôts éventuels)
- `lots` (article_id, numero_lot, fournisseur_id, date_reception, cout_unitaire_gnf, attributs MP : poids_net_kg, grammage, largeur_mm, diametre_mm, plis ; statut)
- `mouvements_stock` (id, date_operation, type : entree | sortie | transfert | ajustement | consommation | production | vente | retour, article_id, lot_id, entrepot_source, entrepot_dest, **quantite + unite** (dans l'unité de stock de l'article), cout_unitaire_gnf, document_type, document_id, auteur) — journal en ajout seul
- Vue `stocks_courants` (article × lot × entrepôt) et vue `couverture_stock` (jours de couverture)
- `inventaires` / `inventaire_lignes` (théorique, compté, écart → ajustement auto)

### 4.4 Production (✅ livré — migration `20261003000400_production.sql` ; listes modifiables postes/équipes/opérateurs/lignes/cadences/causes/campagnes)
- `equipements` (ligne : V-fold, gaufrage, scie à bûches, flow-pack, bundling, compresseur, groupe ; cadence nominale paquets/min)
- `campagnes` · `ordres_fabrication` (produit, quantité visée en colis, dates, statut)
- `postes` (matin | après-midi | nuit, heures début/fin)
- `fiches_production` (OF, date, poste, chef, statut brouillon | validee)
  - `fiche_consommations` (lot bobine, poids_kg consommé)
  - `fiche_productions` (produit, paquets_produits, rebuts_kg)
  - `fiche_arrets` (équipement, cause, debut, fin, durée_min)
  - `fiche_operateurs` (utilisateur / opérateur)
- `causes_arret` (référentiel)
- La validation d'une fiche génère les mouvements de stock (consommation MP, entrée PF) et les alertes.
- Vue `kpi_production` : tonnes, paquets, colis, rendement réel vs théorique, perte, temps d'arrêt, TRS = disponibilité × performance × qualité.

### 4.5 Commercial terrain
- `pva` (id client-UUID, nom, type, responsable, téléphone, quartier_id, ville, **position geography(Point)**, potentiel, commercial_id, client_id éventuel, statut)
- `pva_photos` (pva_id, chemin storage, date)
- `marques_concurrentes` · `pva_concurrence` (visite_id, marque, produit, prix constaté)
- `visites` (id client-UUID, pva_id, commercial_id, checkin_at, **position_checkin**, precision_m, distance_pva_m, dans_zone bool, stock_papel_constate, rupture bool, prix_constate, notes, photo)
- `tournees` (commercial, date, liste ordonnée de PVA)
- `objectifs_commerciaux` (commercial, période, indicateur, cible)

### 4.6 Ventes (✅ livré — migration `20261004000500_ventes.sql` : pièces de vente unifiées devis/commande/facture/avoir, livraisons, paiements, dotations, relances)
- `clients` (niveau, conditions : comptant | credit, plafond_credit_gnf, pva_id éventuel, commercial_id)
- `commandes` / `commande_lignes` (article, quantite_colis, prix_colis_gnf figé, origine : bureau | terrain)
- `livraisons` / `livraison_lignes` (sortie de stock PF) — enrichies en phase 2 (logistique)
- `devis`, `factures` / lignes : créables **hors ligne par le commercial**. Numérotation par série propre à chaque commercial
  (ex. `FA-2026-C01-00042`), continue et sans trou dans chaque série, attribuée sur le téléphone : pas de collision possible hors ligne.
  Facture en PDF partageable (WhatsApp) depuis le téléphone.
- `paiements` saisis **au bureau uniquement** (client, montant, devise, taux, mode, référence) — les commerciaux n'encaissent pas
- `dotations` (client, facture, produit, base_encaisse_gnf, paquets_dus, paquets_remis) — même produit, clients éligibles paramétrables
- `retours` (phase 1 simple : retour en stock ou rebut)

### 4.7 Phase 2
- Achats : `fournisseurs`, `demandes_achat`, `bons_commande` (+ lignes, devise), `conteneurs` (statut : commande → en_mer → au_port → dedouane → livre ; dates prévues/réelles), `frais_approche` (fret, transit, douane, transport → ventilés sur les lots), `documents` (Storage).
- Logistique : `vehicules`, `chauffeurs`, `tournees_livraison`, `chargements`, `preuves_livraison` (photo, signature, GPS).
- Qualité : `controles_qualite` (lot PF, poids paquet, nb mouchoirs, soudure, aspect), `non_conformites`, `actions_correctives`, traçabilité lot MP → lot PF → client (via fiches et livraisons).
- Maintenance : `plans_preventifs`, `interventions` (panne, début, fin), pièces détachées = `articles` famille piece_detachee.

### 4.8 Phase 3
- `comptes_tresorerie` (caisses, banques, devise), `ecritures_tresorerie`, `charges_fixes`, `dettes_fournisseurs`, `previsions_tresorerie`, plan de comptes et export comptable, rapports planifiés (pg_cron + e-mail).

## 5. Plan de livraison

Chaque étape se termine par un **point** (démo, tests, CLAUDE.md à jour) avant la suivante.

**Phase 1 — MVP**
1. ✅ **Fondations** : projet Next.js, Supabase local, auth, rôles, RLS de base, audit, paramètres + taux de change, module `unites` et calculs métier testés, squelette des espaces, seed.
2. ✅ **Stocks** : articles, lots bobines, mouvements, inventaires, seuils, jours de couverture.
3. ✅ **Production** : OF, fiches de poste, validation → mouvements de stock, KPI et alertes rendement/perte/arrêts, TRS.
4. ✅ **Ventes simples** : clients, grille de prix historisée, commande → livraison → facture → paiement, dotation sur encaissé.
5. **PWA terrain** : PVA + GPS + photos, visites avec check-in, commandes et encaissements hors ligne, synchro ; vue responsable commercial avec carte.
6. **Tableau de bord Direction** : filtres de période + comparaison période précédente, alertes du jour, export PDF.

**Phase 2** : achats et conteneurs (coût de revient complet par lot) → logistique → qualité → maintenance.

**Phase 3** : finance (caisse/banque, dettes/créances, compte de résultat, BFR, seuil de rentabilité) → trésorerie prévisionnelle → rapports automatiques → exports comptables.

## 6. Décisions (réponses de la direction, 01/10/2026)

1. Hébergement : au choix de l'équipe technique → développement en local, puis Supabase (région Europe) + Vercel.
2. Connexion identifiant + mot de passe ; un téléphone par commercial ; le commercial fait **devis et factures**.
3. **Aucun encaissement** par le terrain dans l'ERP.
4. Dotation : même produit ; grossistes (B2B activable par paramètre).
5. Prix **au paquet** : Petit 3 400 GNF, Grand 7 666 GNF. Colis Petit de 50, 80 ou 100 paquets selon le client ; Grand 30.
6. Site unique : Coyah.
7. Stock en temps réel (entrées/sorties). Valorisation au coût moyen pondéré (CMP) pour la marge, traçabilité par lot.
8. Dimensionnement standard PME ; cadence nominale paramétrable par équipement.
9. Comptabilité : SYSCOHADA probable ; exports Excel/CSV.
10. Pas de reprise de données ; logo fourni (vert #07524D).

Compléments du 02/10/2026 : prix au paquet identique quelle que soit la taille du colis ; prix HT + TVA 18 % ajoutée ;
prix conseillés Petit 3 600 (max grossiste) / 4 000 / 5 000 ; **ERP paramétrable « à la Odoo »** : toutes les listes sont modifiables par les équipes.

Hypothèses restantes : rayon de check-in GPS 100 m (visite hors zone enregistrée mais signalée).
