# Bilan — parcours quotidiens simplifiés (19/11/2026)

Branche `claude/erp-parcours-quotidiens`, partie du code en production (`0dfdcc0`) plus les travaux non déployés (mots simples, inventaire partiel, coller depuis Excel).
**Rien n'est déployé ; aucune donnée réelle n'a été modifiée.**

## Ce qui change
1. **Commande sur téléphone** :
   - 3 étapes, client créé sans quitter la commande, date souhaitée, récapitulatif avant envoi ;
   - commande par défaut ;
   - suivi jusqu'au paiement ;
   - ce qui n'est pas encore envoyé est rangé à part ;
   - messages compréhensibles.
2. **Préparation et livraison** :
   - le magasin prépare et peut livrer en partie, avec un récapitulatif avant la sortie de stock ;
   - stock physique, réservé et disponible ;
   - produits achetés (sans production).
3. **Facture et paiement** :
   - « Facturer ce qui est livré », sans ressaisie, jamais plus que la commande ;
   - chaque document affiche sa prochaine étape, qui doit agir, et son historique.
4. **Accueil de chaque service** : À faire aujourd'hui, En attente de vous, Ce qui vient de se passer, puis les chiffres. Boutons en mots simples.
5. **Synthèse du PDG** :
   - 8 chiffres avec leur état et « D'où vient ce chiffre ? » ;
   - production cachée tant qu'elle n'a pas démarré ;
   - marge cachée si les coûts manquent ;
   - zone « Données à compléter ».
6. **Vérifier la caisse et la banque** : solde réel, écart calculé par l'ERP, date visible par le PDG.
7. **Chiffres fiables** :
   - l'API ne renvoie que 1 000 lignes par requête ; les indicateurs, les exports comptables et le coût des ventes lisent désormais tout ;
   - une lecture en échec n'est plus montrée comme un zéro.
8. Magasin : réceptions attendues sur l'accueil ; guides d'une page par rôle (`docs/guides/`).

## Migrations à appliquer en production (avec accord)
| Migration | Effet |
|-----------|-------|
| `20261119002700_suivi_commandes` | Nouvelle table de dates + fonctions ; `synchroniser_terrain` remplacée. |
| `20261119002800_produits_achetes` | Colonne `produits.fabrique`, vraie par défaut : rien ne change pour les produits actuels. |
| `20261119002900_facturer_livre` | Vues, fonction `facturer_livre`, `valider_piece` remplacée (plusieurs factures par commande, plafonnées). |
| `20261119003000_accueil_quotidien` | Renomme les boutons d'accueil restés à leur valeur d'origine ; ajoute ceux qui manquent. Ce que l'administrateur a changé est conservé. |
| `20261119003100_rapprochements` | Nouvelle table, nouvelle vue et nouvelles fonctions. |

Aucune ne supprime de données.

## Tests réellement passés (base locale neuve, données de démonstration locales)
- Vitest : 232 sur 232.
- pgTAP : 308 sur 308 (19 fichiers, dont les nouveaux 18 Parcours commande et 19 Vérification de caisse).
- Playwright, écran mobile 360 px : 58 sur 58, dont :
  - commande en ligne, sans réseau puis retour du réseau (sans doublon) ;
  - refus du serveur ;
  - préparation partielle → facture ;
  - accueils ;
  - vérification de caisse.
- Lecture par pages contre l'API réelle locale : 2 937 lignes lues (contre 1 000 avec l'ancienne requête).
- Contrôle des liens : 96 liens des accueils de 7 rôles ouverts avec le compte du rôle, aucun refusé.

## Limites restantes
- **Pas de préversion en ligne** : les variables de préversion Vercel pointent vers la base réelle. Une base de test séparée est nécessaire (à décider).
- Temps d'une commande par une vraie personne : pas encore mesuré (feuille `docs/guides/essais-chronometres.md`).
- Le tableau du journal de trésorerie déborde un peu sur ordinateur étroit (défaut antérieur).
- Lignes d'accueil de la base réelle : renommées seulement par la migration 3000, une fois appliquée.
- Retours, annulations et avoirs : couverts par les tests existants (`16_securisation_ventes`, `ventes-securite`), sans nouvel écran.
