# Universités partenaires, vérification et identité Uny

Ce document décrit le portail université, la carte personnalisée, le moteur de vérification (universités et BAC) et l'identifiant Uny.

```
SOURCES OFFICIELLES (API université, listes importées, BAC)
        ↓
MOTEUR DE VÉRIFICATION UNY (rapprochement strict, preuve minimale)
        ↓
IDENTITÉ UNY (UNY-GN-2026-7K3QXN)  →  CARTE AUX COULEURS DE L'UNIVERSITÉ  →  EMAIL ÉTUDIANT
        ↓
AVANTAGES · PARTENAIRES · MARKETPLACE
```

**Principe.** Uny n'est pas une copie des bases universitaires ou gouvernementales. Il vérifie auprès de la source, reçoit une réponse et ne garde que la preuve : source, méthode, date, statut et référence.

## 1. Ce qui est fonctionnel aujourd'hui

| Élément | État |
| --- | --- |
| Portail université (`/universite`) | ✅ Fonctionnel |
| Carte personnalisée par université (moteur de templates) | ✅ Fonctionnel |
| Niveau 3 : confirmation manuelle dans le portail | ✅ Fonctionnel |
| Niveau 2 : import CSV/Excel et confirmation automatique | ✅ Fonctionnel |
| Niveau 1 : connecteur API | ⚙️ Prêt, mais **aucune université n'est raccordée**. S'active seulement avec un accord signé, une clé et un test réussi. |
| BAC : source officielle | ❌ **Non connectée** : aucun accès officiel. Vérification manuelle par le numéro de PV du candidat en attendant. |
| Emails étudiants | ⚙️ Réservation des adresses prête. Les boîtes seront créées chez le fournisseur une fois le domaine acheté (voir [EMAILS-ETUDIANTS.md](EMAILS-ETUDIANTS.md)). |

## 2. Ouvrir le portail d'une université

1. L'université remplit la demande sur **`/universites`**, accessible par le lien « Universités partenaires » en bas du site. Tu peux aussi créer l'établissement dans **Admin → Universités → Ajouter**.
2. **Vérifie l'identité du demandeur** : appel à la scolarité, courrier ou email officiel.
3. **Admin → Universités** : clique sur « Approuver et ouvrir le portail ». Cela :
   - passe l'établissement en « Partenaire » ;
   - crée un compte avec un mot de passe provisoire, affiché une seule fois et envoyé par email ;
   - relie simplement le compte s'il existe déjà.
4. Sur la fiche de l'université, tu peux ajouter ou retirer des administrateurs, suspendre le partenariat et configurer la carte ou le connecteur API.

| Statut | Effet |
| --- | --- |
| Référencée | L'établissement apparaît seulement dans la liste à l'inscription. |
| En attente | Le portail est ouvert pour préparer la carte et la fiche, sans décision possible. |
| Partenaire | Confirmations, imports, API et carte personnalisée visible chez les étudiants. |
| Suspendue | Accès au portail coupé. |

## 3. Ce que fait l'université dans son portail

| Rubrique | Contenu |
| --- | --- |
| Tableau de bord | Demandes à traiter, inscriptions confirmées (dont automatiques), cartes actives, utilisations chez les partenaires sur 30 jours, répartition par faculté |
| Demandes | Confirmer ou refuser, avec motif obligatoire, les étudiants qui déclarent une inscription. Les critères de rapprochement sont affichés (✓ matricule, ✓ nom, ✗ naissance…). |
| Étudiants & cartes | Recherche par nom, matricule ou identifiant Uny. Actions : **expirer** une carte (fin d'inscription), **révoquer** (fraude, exclusion) ou réactiver. |
| Listes d'étudiants | Import CSV/Excel et historique. Suppression automatique après l'année. |
| Carte | Nom officiel, logo, 3 couleurs, modèle (Classique, Bandeau, Sobre), champs affichés et libellés, aperçu en direct, historique des versions |
| Établissement | Fiche (sigle, ville, site, email de la scolarité, liste des facultés), demande de raccordement API, journal d'activité |

**Cloisonnement.** Les règles de la base de données (RLS et fonctions sécurisées) garantissent qu'une université ne voit que les étudiants qui ont déclaré une inscription chez elle. Elle ne voit jamais les autres universités, les empreintes importées ni les profils complets.

## 4. Parcours de vérification d'un étudiant

```
Étudiant → identité (compte Uny) → université → matricule, faculté, filière, niveau
  → moteur : 1. API (si active)  2. liste importée  3. portail
  → correspondance stricte → confirmée | à examiner | en attente | refusée
  → carte Uny activée aux couleurs de l'université
```

| Statut | Signification |
| --- | --- |
| `pending` | En attente de l'université (portail) |
| `manual_review` | Matricule trouvé, mais une information diffère : vérification humaine obligatoire |
| `verified` | Inscription confirmée : carte active jusqu'au 30 septembre de l'année universitaire |
| `rejected` | Refusée ou carte révoquée, avec motif envoyé à l'étudiant |
| `expired` | Fin d'année ou expiration par l'université |

**Règle de rapprochement.** La comparaison est exacte, jamais approximative. Les noms sont normalisés : accents retirés, majuscules, ordre des mots ignoré.

- **Confirmation automatique** seulement si **matricule + nom + (date de naissance ou prénom)** correspondent.
- Une date de naissance différente bloque toujours la confirmation automatique.
- Un matricule déjà confirmé pour un autre compte passe « à examiner ».
- Un nom simplement ressemblant n'est jamais validé.

Les étudiants dont l'établissement n'est pas partenaire continuent d'envoyer un justificatif, examiné dans **Admin → Vérifications → Justificatifs**.

Chaque nuit à 3 h 15, une tâche planifiée (pg_cron) expire les inscriptions arrivées à échéance, supprime les listes périmées et applique la politique des emails.

## 5. Niveau 2 : import de listes

- **Formats** : `.xlsx` ou `.csv`, avec séparateur `;`, `,` ou tabulation, en UTF-8 ou Windows-1252.
- **Colonnes reconnues automatiquement** :
  - obligatoires : **Matricule** et **Nom** ;
  - facultatives : Prénom(s), Date de naissance, Faculté, Département, Filière, Niveau.
- **Contenu stocké** : uniquement des empreintes HMAC-SHA256 du matricule, du nom, du prénom et de la date de naissance. Faculté, filière et niveau sont gardés en clair pour la carte.
- **Clé des empreintes** : `UNY_MATCH_SECRET` côté serveur si elle est définie, sinon une clé dérivée de `SUPABASE_SERVICE_ROLE_KEY`. Sans elle, les empreintes sont inexploitables. **Ne jamais la changer** (ni faire tourner la clé Supabase si aucune clé dédiée n'est définie) : les listes déjà importées devraient être réimportées.
- **Remplacement** : une nouvelle liste remplace la précédente pour la même année. Les demandes en attente sont aussitôt rapprochées.
- **Purge** : les listes sont supprimées automatiquement le 31 octobre qui suit la fin de l'année universitaire.

## 6. Niveau 1 : connecteur API

Le connecteur générique `rest_json_v1` est défini dans `src/lib/verification/connectors.ts`.

**Requête envoyée par Uny :**

```
POST {base_url}/students/verify            (chemin modifiable : field_mapping.verify_path)
Authorization: Bearer <clé>   ou   X-API-Key: <clé>
{ "student_number": "...", "last_name": "...", "first_name": "...", "birth_date": "2003-05-14", "academic_year": "2026-2027" }
```

**Réponse attendue :**

```
{ "found": true, "enrolled": true, "last_name": "...", "first_name": "...", "birth_date": "...", "faculty": "...", "program": "...", "level": "...", "reference": "..." }
```

Les chemins des champs se règlent dans `field_mapping`, sans code. Exemple : `{ "enrolled": "data.inscrit", "last_name": "data.nom" }`.

**Activation**, dans Admin → Universités → fiche → Connecteur API :

1. Accord signé avec l'université (référence et date).
2. Clé fournie par l'université, ajoutée dans **Vercel → Settings → Environment Variables** sous un nom `UNIV_<SIGLE>_API_KEY`. Seul ce nom est saisi dans l'admin, jamais la clé.
3. URL HTTPS, puis « Tester la connexion » sur `GET {base_url}/health`.
4. Statut « Actif ». La base refuse l'activation sans accord, URL et clé, et l'admin la refuse sans test réussi.

**Garanties.**

- HTTPS uniquement, sans redirection, avec un délai maximal de 8 s.
- Chaque appel est journalisé dans le registre d'audit.
- Le connecteur se désactive en un clic.
- Si l'API ne répond pas, la liste importée puis le portail prennent le relais.

**Nouveau format d'API.** Ajoute un connecteur dans `CONNECTORS`, puis la valeur correspondante dans la contrainte SQL `university_integrations.provider`.

## 7. Carte personnalisée (moteur de templates)

Où personnaliser : **Admin → Cartes personnalisées** (toutes les universités, bouton « Personnaliser la carte »), ou le portail de l'université (rubrique Carte).

Aucune carte n'est codée à la main. Tables `university_branding` et `university_card_templates` (versionnées, une seule active).

- **Toujours présents (identité Uny)** : logo uny., nom, photo, identifiant Uny, QR code sécurisé, statut de vérification.
- **Au choix de l'université** :
  - faculté, département, filière, niveau ;
  - matricule, année universitaire, date de validité ;
  - libellés personnalisables.
- **Visibilité** : dès qu'une carte est publiée pour une université, tous ses étudiants **vérifiés** (inscription confirmée ou justificatif validé) la voient, sauf si l'établissement est suspendu. Les étudiants non vérifiés gardent la carte Uny standard.

## 8. Baccalauréat

- **Pas de connecteur officiel actif.** Aucun scraping ni contournement. Le connecteur `officialBacProvider` (`src/lib/verification/bac.ts`) reste « non connecté » tant qu'un accès légal n'est pas contractualisé avec l'organisme officiel.
- **Procédure manuelle actuelle** :
  1. L'étudiant indique l'année et son **numéro de PV** (aucun document à envoyer).
  2. L'admin recherche ce numéro dans les résultats officiels publiés (**Admin → Vérifications → BAC**) et vérifie le nom et la mention « admis ».
  3. L'admin décide. Le numéro complet est **effacé** à la décision.
- **Preuve conservée** : source, méthode, date, statut, année, numéro **masqué** (••••4567) et son empreinte pour détecter les doublons.

## 9. Identifiant Uny

- **Format** : `UNY-GN-2026-7K3QXN`, c'est-à-dire pays, année, 5 caractères aléatoires et 1 caractère de contrôle (alphabet sans I, L, O, U).
- **Sécurité** : non séquentiel et sans aucune donnée personnelle. Le caractère de contrôle détecte les fautes de frappe au scanner.
- **Comptes existants** : ils gardent leur identifiant `GN-2026-000145`, qui est permanent et reste accepté partout.

## 10. Console admin

| Rubrique | Contenu |
| --- | --- |
| **Universités** | Demandes, création, approbation, suspension, administrateurs du portail, connecteur API (test, activation, désactivation), imports, carte |
| **Vérifications** | Onglets Justificatifs, Universités, BAC et Registre (type, étudiant, source, méthode, statut, date) |
| **Emails étudiants** | Réglages (domaine, fournisseur, politique de fin de statut), contrôle SPF, DKIM et DMARC, adresses (adresse, étudiant, université, statut, création, dernière synchronisation) |
