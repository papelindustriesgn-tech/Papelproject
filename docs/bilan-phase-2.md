# Bilan de la phase 2 — Papel ERP

Date : 02/10/2026. Branche : `claude/cadrage-architecture`.

## Livré

| Étape | Contenu |
|---|---|
| 1. Achats | Demandes d'achat (magasin, production, achats), bons de commande en USD ou GNF (taux du jour figé à l'envoi, saisie à la tonne), conteneurs suivis du départ à l'usine (dates prévues et réelles, statut déduit), frais d'approche GNF/USD, **coût de revient complet au kg** comparé au prévu, réception des bobines par conteneur à ce coût, tonnes en transit, documents joints privés |
| 2. Logistique | Véhicules (capacité en colis), chauffeurs, tournées de livraison, feuille de route imprimable, **preuve de livraison** (signature au doigt, photo, position GPS), livraison partielle ou refus avec retour automatique en stock, dépenses de tournée, coût par colis livré et au km |
| 3. Qualité | Critères de contrôle paramétrables (tolérances), contrôles à réception et en production avec conformité recalculée en base, **blocage automatique** d'une bobine non conforme, non-conformités et actions correctives jusqu'à la clôture, réclamations clients, code de lot des produits finis, **traçabilité** bobine ↔ lot de produits finis ↔ clients |
| 4. Maintenance | Parc d'équipements (criticité A/B/C), pannes signalées par la production, ordres de travail, pièces de rechange sorties du stock à la clôture, plans préventifs et génération des OT à échéance, **MTBF, MTTR, disponibilité**, coût de maintenance, pièces critiques sous le seuil |

Tableaux de bord : transit (Magasin, Direction) ; alertes Direction ajoutées : bons de livraison non remis depuis plus de 2 jours,
non-conformités critiques ouvertes, pièces critiques sous le seuil.

## Qualité du logiciel

- Vitest : 124 tests (dont coûts d'achat, indicateurs logistiques, conformité qualité, fiabilité maintenance).
- pgTAP : 144 tests de droits et de règles (fichiers 06 à 09 pour la phase 2) — sur base réinitialisée.
- Playwright : 43 parcours sur écran de téléphone, dont la chaîne complète demande → commande → conteneur → réception,
  la tournée avec signature et GPS, le contrôle non conforme → NC → clôture, la panne → réparation → préventif.

## Ce que l'équipe Papel doit saisir

1. **Achats** : fournisseurs (devise), types de frais d'approche et de documents (valeurs de départ fournies).
2. **Logistique** : véhicules (immatriculation, capacité en colis), chauffeurs ; compte « logistique » pour chaque chauffeur qui saisit les remises.
3. **Qualité** : ajuster les tolérances des critères (valeurs de départ indicatives : grammage 12,5–13,5 g/m², humidité ≤ 8 %…).
4. **Maintenance** : parc machines, pièces de rechange (articles « pièce détachée » avec seuil), pièces critiques par machine,
   plans préventifs ; heures d'ouverture par jour (paramètre, 16 h par défaut).

## Limites connues

- Traçabilité vers les clients : **estimation** (même produit livré dans les 30 jours suivant la fabrication), car les ventes ne
  suivent pas les numéros de lot. Un suivi exact demanderait de scanner le lot à la préparation des livraisons.
- La logistique fonctionne en ligne (pas de mode hors ligne comme l'application des commerciaux) : prévoir une couverture réseau
  ou une saisie au retour.
- Les arrêts « panne » des fiches de production et les pannes de la maintenance sont saisis séparément (pas de rapprochement automatique).
- Coût des pièces de maintenance : au coût moyen pondéré au moment de la sortie.

## Suite : phase 3

Finance complète (trésorerie, créances et dettes, charges fixes, résultat mensuel, BFR, seuil de rentabilité), trésorerie
prévisionnelle, rapport hebdomadaire envoyé automatiquement, exports comptables SYSCOHADA.
