# Espace partenaire Uny — mode d'emploi

L'espace partenaire permet aux commerçants et entreprises de publier pour les étudiants et de vérifier leur carte Uny. Il fonctionne sur le site et dans l'application mobile (même compte).

## 1. Ajouter un partenaire

Deux façons :

- **Le partenaire fait la demande** sur `/partenaires` (lien « Devenir partenaire » en bas du site).
  La demande arrive dans **Admin → Demandes partenaires**, avec un badge rouge. Tu reçois aussi un email si le SMTP est configuré.
  Clique sur **Accepter et créer l'accès**. Uny crée alors :
  - la fiche partenaire, déjà publiée ;
  - un compte dont l'identifiant est l'email du partenaire, avec un **mot de passe provisoire** affiché une seule fois. Il est aussi envoyé par email ; transmets-le par WhatsApp si l'email n'arrive pas.
- **Tu ajoutes le partenaire toi-même** dans **Admin → Partenaires → Nouveau**. Sur sa fiche, la section « Accès à l'espace partenaire » permet ensuite de donner l'accès à une ou plusieurs personnes (prénom, nom, email).

Si l'email appartient déjà à un compte Uny (par exemple un étudiant qui tient un commerce), ce compte est simplement relié. La personne garde son espace étudiant et voit « Espace partenaire » dans son profil.

## 2. Ce que fait le partenaire

| Rubrique | Contenu |
| --- | --- |
| **Tableau de bord** | Codes promo utilisés et montants encaissés sur 30 jours, cartes validées aujourd'hui, étudiants servis, vues des offres, derniers passages |
| **Scanner** | Validation des **codes promo** (UNY-XXXX-XX). Scan du QR code de la carte Uny avec la caméra, ou saisie du numéro (UNY-GN-2026-7K3QXN, ou l’ancien format GN-2026-000145). Le partenaire choisit l'offre utilisée. |
| **Offres étudiantes** | Réductions affichées dans « Avantages », avec prix normal et prix étudiant facultatifs |
| **Boutique** | Produits en promotion : prix avant promo et prix étudiant. Ils apparaissent en premier dans la marketplace avec le pourcentage de réduction. |
| **Ma fiche** | Nom, logo, description, ville, quartier, adresse, téléphone, **code marchand Orange Money** ; changement de mot de passe ; suppression du compte |

## 3. Codes promo et paiement Orange Money

1. L'étudiant ouvre une offre et appuie sur **« Obtenir mon code promo »**. Le code est personnel, valable 7 jours (sans dépasser la fin de l'offre) et utilisable une seule fois.
2. Si le partenaire a renseigné son **code marchand Orange Money** (Ma fiche), l'application affiche ce code et le montant (prix étudiant). L'étudiant paie directement depuis son téléphone (#144# ou application Orange Money), puis peut saisir la référence de la transaction reçue par SMS.
3. Au comptoir, le partenaire saisit le code dans **Scanner → Valider un code promo**. Il voit le nom de l'étudiant, l'offre, le prix et la référence déclarée. Il **vérifie le paiement sur son relevé Orange Money**, puis valide : le code passe à « utilisé » et l'étudiant reçoit une notification.

**Uny n'encaisse rien et ne prend aucune commission** : l'argent va directement de l'étudiant au partenaire. Aucune API Orange Money n'est raccordée pour l'instant, donc aucun paiement n'est confirmé automatiquement. Le raccordement (confirmation automatique) se fera seulement après un accord signé avec Orange Money.

## 4. Ce qui s'affiche au scan

| Résultat | Signification |
| --- | --- |
| ✅ **Étudiant vérifié** (vert) | Justificatif validé par Uny et carte valide : appliquer la réduction |
| **Statut étudiant non vérifié** (orange) | Inscrit, mais justificatif pas encore validé. Accepté seulement si l'offre n'est pas « réservée aux étudiants vérifiés ». |
| **Carte expirée / désactivée** (rouge) | Ne pas appliquer la réduction |
| **Carte introuvable** | QR code ou numéro inconnu |

Le résultat affiche aussi la photo, le nom et l'établissement : le partenaire compare avec la personne présente. Sur la carte montrée par l'étudiant, l'heure défile en direct, ce qui empêche d'utiliser une capture d'écran. Si l'étudiant a déjà utilisé la même offre ce jour-là, un avertissement s'affiche.

L'étudiant reçoit une notification « Carte Uny validée ✅ » à chaque passage accepté. Le partenaire voit l'historique dans son tableau de bord.

## 4. Règles et sécurité

- Un partenaire ne voit et ne modifie que ses propres contenus (règles appliquées dans la base de données).
- Mise en avant (« Meilleures réductions »), badge « Démo » et activation de la fiche restent réservés à l'admin.
- Pour retirer un partenaire, deux possibilités dans **Admin → Partenaires** : décocher « Publié », ce qui masque toutes ses offres, ou retirer l'accès d'une personne.
- Les vérifications sont limitées à 300 par heure et par partenaire.
- Les comptes partenaires sont exclus des statistiques « étudiants », de l'enquête et de la page « Contacter les inscrits ».

## 5. Toute la Guinée

Toutes les villes de Guinée sont actives : Conakry, Kindia, Labé, Kankan, N'Zérékoré, Boké, Mamou, Coyah, Dubréka, Kamsar, Fria, Pita, Dalaba, Faranah, Kissidougou, Siguiri, Guéckédou et Macenta.

- Chaque étudiant voit par défaut les contenus de **sa ville**. Il peut choisir une autre ville ou « Toute la Guinée ».
- Un contenu sans ville (offre nationale, job à distance) apparaît partout.
- Les quartiers sont proposés pour Conakry ; ailleurs, le quartier est un champ libre.
- Pour ajouter une ville : Supabase → SQL Editor → `insert into public.cities (country_code, name, slug, is_active) values ('GN', 'Nom', 'slug', true);`
