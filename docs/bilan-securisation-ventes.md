# Bilan — sécurisation des factures, encaissements, avoirs et retours

Branche : `claude/securisation-ventes-paiements` (depuis `claude/cadrage-architecture`, `7f6f99f`).
Version auditée : `96badf2` ; seul commit ultérieur (`7f6f99f`, écran des réglages) conservé, sans lien avec les ventes.
Migration ajoutée : `supabase/migrations/20261022002500_securisation_ventes.sql` (aucune migration existante réécrite).

## 1. Défauts : constat avant correction

Les cinq défauts ont été **reproduits sur une base locale isolée** (scripts SQL avec les rôles réels), avant correction :

| # | Défaut | Reproduction locale (avant) | Après correction |
|---|--------|-----------------------------|------------------|
| 1 | Facture validée remise en brouillon par un commercial | `update pieces_vente set statut='brouillon'` accepté ; totaux modifiables (`piece_figee` ne contrôlait ni le statut ni le HT) ; insertion directe d'une pièce `statut='valide'` possible | Refusé (42501), y compris insertion « déjà validée » ; contenu financier figé même hors API |
| 2 | Double retour en stock | Stock −100 (BL), +20 (retour livraison), **+20 de nouveau** à la validation de l'avoir (`p_retour_stock: true` imposé) | Les 20 sont rattachés au retour de livraison, stock inchangé ; nouveau retour explicite, plafonné, unique |
| 3 | Encaissement direct de 999 999 999 GNF | Insertion directe (rôle finance) acceptée + mouvement de trésorerie créé | Insertion directe refusée ; trigger de contrôle sur tout chemin ; verrou de facture ; idempotence |
| 4 | Avoir refusé sur facture payée | « L'avoir dépasse le reste dû… » | Accepté dans la limite créditable ; crédit client explicite ; remboursement saisi à part |
| 5 | `valider_piece` contournait `valider_avoir` | Avoir de 500 paquets validé sur une facture de 100 | Mêmes contrôles par tous les chemins (`valider_piece` = circuit unique) |

Paiements concurrents (point 3) : non reproductibles avec un script séquentiel ; le défaut découlait de la lecture du solde
sans verrou dans `enregistrer_paiement` (deux transactions lisaient le même solde). Le correctif est prouvé par
`scripts/test-concurrence-paiements.sh` (deux sessions simultanées : une acceptée, l'autre refusée).

**Données réelles (lecture seule, base `shnwwgbcrmfswzaecmeo`, 22/10/2026)** : 0 pièce de vente, 0 paiement, 0 livraison,
0 mouvement de stock, 0 encaissement en trésorerie. Le journal d'audit ne contient que la démonstration du 10/10, purgée le 16/10.
Stocks cohérents (aucun écart entre `stocks_articles` et la somme des mouvements), aucun doublon de retour.
**Aucune incohérence existante, donc aucun rapprochement à proposer.** Les 5 modes de paiement ont un compte de trésorerie.

## 2. Changements

### Base de données (migration `20261022002500`)
- `piece_figee` (avant insertion / mise à jour / suppression) : par l'API (`est_acces_api()`), une pièce naît en brouillon (totaux
  remis à 0), ne change ni de statut, ni de numéro, ni de type, ni de liens, ni de totaux ; validée, elle est figée pour tous, sauf
  l'annulation d'un devis ou d'une commande.
- `ligne_piece_modifiable` : verrou partagé de la pièce (pas de ligne ajoutée pendant une validation) ; prix, rattachement et
  produit d'un avoir non modifiables par l'API ; pas de ligne libre dans un avoir.
- `annuler_piece`, `transformer_piece` : désormais `security definer` avec contrôle explicite des droits (le passage direct étant fermé).
- Avoirs : `lignes_piece.origine_ligne_id`, `retour_stock_paquets`, `retour_livraison_paquets` ;
  `pieces_vente.avoir_reduction_creance_gnf`, `avoir_credit_client_gnf` ; fonction `analyser_avoir` (aperçu = validation) ;
  `valider_piece` applique les contrôles d'avoir (rattachement, prix, quantités, TTC, retours), `valider_avoir` devient un alias.
- Retours : `reste_a_livrer` déduit les paquets rapportés crédités ; index unique `mouvements_stock_retour_unique`
  (une entrée « retour » par document et article) ; `enregistrer_remise` regroupe ses retours par article.
- Encaissements : politique `paiements_ajout` supprimée et `insert` révoqué ; trigger `controler_paiement` ; `montants_facture`
  (verrou `for update` de la facture) ; `enregistrer_paiement(…, p_cle)` idempotent ; paiements inaltérables ;
  encaissement refusé si le mode n'a pas de compte de trésorerie.
- Crédit client : `factures_etat.credit_client_gnf`, `rembourse_gnf` ; `soldes_clients.credit_client_gnf` ; table
  `remboursements_clients` (audit, RLS lecture finance / responsable commercial) + `enregistrer_remboursement` + sortie de trésorerie.

### Interface
- Ventes : menu **Encaissements** (nouvel écran : période, mode, recherche, export Excel), **Avoirs** et **Dotations** sortis de
  « Configuration » ; tuiles « Encaissements » de la Direction → `/ventes/encaissements` (au lieu des impayés).
- Avoir : colonne « Retour en stock » par ligne (plafond affiché, paquets déjà revenus à la livraison), carte « Ce que fera cet
  avoir » (réduction de créance, crédit client, stock), validation en deux temps avec rappel des conséquences, carte « Effets de cet
  avoir » une fois validé.
- Facture : crédit client visible, carte « Crédit client et remboursements » (saisie explicite), avoir masqué si tout est crédité.
- Erreurs de chargement : `exigerDonnees` + `src/app/(app)/error.tsx` (message, « Réessayer », référence) sur Stocks (vue
  d'ensemble, articles), pièces, facture, impayés, dotations, encaissements et exports comptables — plus jamais 0 ou liste vide.
- Exports comptables : le remboursement porte le code client en compte tiers.

## 3. Tests (exécutés sur la base locale isolée — aucun scénario sur la production)

| Vérification | Résultat |
|---|---|
| TypeScript (`tsc --noEmit`) | OK, 0 erreur |
| Lint (ESLint) | OK, 0 erreur |
| Vitest | **190 / 190** (dont 5 nouveaux : `avoirs.test.ts`, `resultat.test.ts`) |
| pgTAP sur base fraîchement réinitialisée | **267 / 267** (16 fichiers ; nouveau `16_securisation_ventes.test.sql` : 70 tests) |
| Concurrence (`scripts/test-concurrence-paiements.sh`) | RÉUSSI : 1 paiement accepté, 1 refusé, 1 mouvement de trésorerie |
| Build de production (`next build`) | OK |
| Playwright (360 px, base neuve) | **37 / 50** ; les 13 échecs existent à l'identique sur la version auditée (voir limites) |

Couverture des régressions (pgTAP) : commercial (remise en brouillon, totaux, lignes, insertion validée, validation directe),
finance (note, suppression, insertion directe de paiement, montants nul/négatif/excessif, devis, brouillon), magasin (annulation,
encaissement), postgres hors API ; retour partiel à la livraison + avoir, double validation, doublon de remise, retour en double
refusé, avoirs successifs jusqu'au TTC exact, facture sans livraison ; avoir sur facture partiellement payée (13 500 de réduction,
3 250 de crédit), remboursement plafonné, sortie de trésorerie ; double clic (même clé) et deux règlements égaux légitimes.

Playwright nouveau (`e2e/ventes-securite.spec.ts`, 4 parcours) : double clic sur « Enregistrer le paiement » ; avoir sur facture
payée avec confirmation, crédit et remboursement ; menu Ventes ; **Stocks en erreur réelle** (droit de lecture retiré sur la base
locale) → message + « Réessayer » → données revenues. `e2e/ventes.spec.ts` réaligné (titres, colis de 100) : 5 / 5.

### Limites
- **13 parcours Playwright échouaient déjà sur la version auditée** (achats, direction, finance, production ×3, socle ×4, stocks ×2,
  terrain) : libellés et données de démonstration ayant changé lors des refontes précédentes. Ils ne sont pas liés à ce correctif
  (comparaison test par test sur base neuve : mêmes échecs avant / après). Le parcours terrain (synchronisation → `valider_piece`)
  est couvert par pgTAP `05_terrain` (OK).
- La dotation reste calculée sur les paiements bruts (un remboursement ou un avoir ne la réduit pas) : règle métier à confirmer.
- Un paiement ou un remboursement est désormais **inaltérable même pour l'administrateur base** : une purge future devra
  désactiver explicitement le trigger (`paiements_inalterables`), comme pour le journal de trésorerie.
- Captures : `docs/captures/securisation-ventes/` (ordinateur 1280 px, téléphone 390 px), sur données de démonstration locales.

## 4. Déploiement, vérification, récupération

**Aucun déploiement n'a été fait.** À faire seulement après accord explicite.

1. **Avant** : sauvegarde (Supabase → Database → Backups, ou `pg_dump` du schéma `public`) ; vérifier que la production est à la
   migration `coordination` (`list_migrations`). Contrôles en lecture seule (doivent renvoyer 0) :
   ```sql
   select count(*) from public.mouvements_stock where type = 'retour' and document_type in ('avoir','livraison')
     group by document_type, document_id, article_id having count(*) > 1;            -- doublons (bloqueraient l'index unique)
   select count(*) from public.modes_paiement m where m.compte_id is null
     and not exists (select 1 from public.comptes_tresorerie where type_compte='caisse' and devise='GNF' and actif); -- modes sans compte
   ```
2. **Migration** : appliquer `20261022002500_securisation_ventes.sql` telle quelle (transaction unique : tout ou rien).
3. **Application** : fusionner la branche puis déployer Vercel (les écrans dépendent des nouvelles colonnes : migration d'abord).
4. **Vérifier** (lecture seule + un essai contrôlé) :
   ```sql
   select proname from pg_proc where proname in ('analyser_avoir','enregistrer_remboursement','montants_facture');      -- 3 lignes
   select has_table_privilege('authenticated','public.paiements','insert');                                                -- false
   select tgname from pg_trigger where tgname in ('piece_figee','paiements_controle','paiements_inalterables');           -- 3 lignes
   ```
   Puis, dans l'interface : Ventes → Encaissements s'ouvre ; une facture de test → paiement → avoir → crédit visible.
5. **Récupération** : la migration n'altère aucune donnée (colonnes ajoutées à valeur neutre, vues recréées compatibles).
   - Échec pendant l'application : rien n'est appliqué (transaction), redéployer la version précédente de l'application.
   - Retour arrière après coup : redéployer la version précédente de l'application (elle ignore les nouvelles colonnes), puis, si
     nécessaire, restaurer la sauvegarde de l'étape 1 ; ne **pas** supprimer à la main les tables/colonnes si des avoirs, crédits ou
     remboursements ont déjà été saisis (perte d'historique). L'ancienne application appelle `enregistrer_paiement` à 5 arguments :
     compatible (le 7e argument a une valeur par défaut).
