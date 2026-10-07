# Emails étudiants Uny

Chaque étudiant vérifié peut recevoir une adresse unique `prenom.nom@etu.unyafrica.com`, ou sur le domaine étudiant retenu.

**Uny n'héberge aucun serveur de messagerie.** Les boîtes sont chez un fournisseur professionnel. Uny gère :

- l'attribution des adresses ;
- les homonymes ;
- le cycle de vie des adresses ;
- la journalisation.

## 1. Prérequis (à faire par toi)

1. **Acheter le domaine** `unyafrica.com`, puis créer le sous-domaine étudiant `etu.unyafrica.com`.
2. **Choisir un fournisseur** et ouvrir le compte au nom de Papel Industries ou d'Uny :

   | Fournisseur | Coût | Remarque |
   | --- | --- | --- |
   | Google Workspace for Education | Gratuit pour les établissements éligibles, sinon payant | Console : admin.google.com |
   | Microsoft 365 A1 | Gratuit pour les établissements éligibles | Console : admin.microsoft.com |
   | Zoho Mail | Offre gratuite limitée, puis payante | Console : mailadmin.zoho.com |

   Les offres « Éducation » demandent généralement un statut d'établissement d'enseignement. Uny n'en étant pas un, vérifie l'éligibilité ; sinon, prévois l'offre payante.
3. **Enregistrements DNS** chez le fournisseur du domaine (Vercel DNS si le domaine est acheté sur Vercel) :

   | Type | Nom | Valeur |
   | --- | --- | --- |
   | MX | `etu` | Fournie par le fournisseur |
   | TXT (SPF) | `etu` | `v=spf1 include:_spf.google.com ~all` (Google) ou `v=spf1 include:spf.protection.outlook.com -all` (Microsoft) |
   | TXT (DKIM) | `google._domainkey.etu` / `selector1._domainkey.etu` / `zmail._domainkey.etu` | Clé générée dans la console du fournisseur |
   | TXT (DMARC) | `_dmarc.etu` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@unyafrica.com` (passer ensuite à `p=reject`) |

4. **Dans la console du fournisseur** :
   - MFA obligatoire ;
   - anti-spam et anti-hameçonnage activés ;
   - email de récupération = email personnel vérifié de l'étudiant ;
   - journaux d'audit conservés.
5. **Admin Uny → Emails étudiants** :
   - renseigner le domaine et le fournisseur ;
   - cliquer « Vérifier SPF, DKIM et DMARC » : les trois doivent être ✅.

## 2. Cycle de vie

```
Étudiant vérifié → identifiant Uny → adresse disponible vérifiée → réservation (À créer)
→ création de la boîte chez le fournisseur → « Boîte créée → activer » (Active) → associée au compte Uny
```

| Statut | Signification |
| --- | --- |
| `pending` (À créer) | Adresse réservée, la boîte n'existe pas encore chez le fournisseur |
| `active` | Boîte créée et utilisable |
| `suspended` | Bloquée : fin de statut, ou révocation de la carte qui entraîne toujours la suspension. Réactivable. |
| `alumni` | Conservée après les études (politique alumni) |
| `disabled` | Désactivée définitivement, ou compte Uny supprimé |

**Règles d'attribution.**

- Format `prenom.nom`, sans accents ni espaces (« Aïssatou Bah » → `aissatou.bah`).
- Homonymes : `prenom.nom2`, `prenom.nom3`…
- Adresses système réservées : postmaster, abuse, admin…
- **Une adresse n'est jamais réattribuée** : elle reste réservée même après désactivation ou suppression du compte.
- **Aucun mot de passe n'est stocké dans Uny.** Le mot de passe initial est défini dans la console du fournisseur, avec changement obligatoire à la première connexion.

**Fin du statut étudiant.** Uny ne supprime jamais brutalement une adresse. Il applique la politique choisie dans l'admin :

- « suspendre » (réglage par défaut) ou « alumni » ;
- après un délai de grâce, 30 jours par défaut ;
- automatiquement chaque nuit, ou manuellement avec le bouton dédié.

**Synchronisation.** La colonne « Dernière synchro » signale les changements à répercuter chez le fournisseur. Exemple : une adresse suspendue dans Uny doit aussi être suspendue dans la console.

## 3. Automatisation (plus tard)

Quand le domaine et le compte fournisseur existeront, on pourra ajouter un connecteur API dans `src/lib/student-email.ts` (Google Admin SDK Directory ou Microsoft Graph). Il créera, suspendra et réactivera les boîtes automatiquement.

D'ici là, ces connecteurs restent **non connectés** : aucune création automatique n'est déclarée fonctionnelle.

Les identifiants du fournisseur (compte de service, certificat) iront dans les variables d'environnement Vercel, jamais dans la base.
