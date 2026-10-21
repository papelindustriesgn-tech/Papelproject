# Uny sur Google Play

> Vue d'ensemble des deux boutiques, exigences vérifiées et checklist : `docs/PUBLICATION-STORES.md`.

L'application Android (dossier `android/`) affiche le site www.unyafrica.com en plein écran
(technologie « Trusted Web Activity »). Toute mise à jour du site est donc visible tout de suite
dans l'application, sans republier sur Google Play.

> **Quelle application envoyer ?** Le dépôt contient aussi `mobile/` (Capacitor, Android + iOS).
> Les deux utilisent le même nom de paquet `com.unyafrica.app` : un seul peut être publié.
> Pour **Google Play**, on envoie celui-ci (`android/`, fichier `uny-1.0.0.aab`) : il est déjà signé
> et le site est vérifié par Google. `mobile/` reste utilisé pour l'**App Store** (iOS).

## Identité de l'application

| Élément | Valeur |
|---|---|
| Nom du paquet | `com.unyafrica.app` (définitif, ne peut plus changer après publication) |
| Version | 1.0.0 (code 1), cible Android 16 (API 36) |
| Clé de téléversement | `uny-upload.keystore`, alias `uny` (à conserver précieusement, hors du dépôt) |
| Empreinte SHA-256 | `D6:0B:09:80:94:FD:49:D5:A5:16:E0:99:78:FD:9A:66:E6:3B:1E:8A:59:AA:A9:43:16:25:D9:49:30:23:6B:96` |
| Vérification du site | `public/.well-known/assetlinks.json` |

## Publier (première fois)

1. Créer le compte développeur sur https://play.google.com/console (25 $, une seule fois).
2. « Créer une application » : nom **Uny — Le passeport étudiant**, langue **français**, application, gratuite.
3. **Tester et publier → Production → Créer une version** : laisser Google gérer la signature
   (« Signature des applications par Google Play »), puis téléverser `uny-1.0.0.aab`.
4. Après le premier téléversement : **Configuration → Intégrité de l'application → Signature de l'application**,
   copier l'empreinte SHA-256 de la **clé de signature d'application** et l'ajouter dans
   `public/.well-known/assetlinks.json` (en plus de celle ci-dessus), puis redéployer le site.
   Sans cette étape, l'application installée depuis Google Play affiche une barre d'adresse en haut.
5. Remplir la fiche (textes ci-dessous), les captures, le questionnaire de classification du contenu,
   la section « Sécurité des données » et la politique de confidentialité, puis envoyer en examen.

## Fiche Google Play

**Titre (30 caractères max)** : Uny — Le passeport étudiant

**Description courte (80 caractères max)** :
Ta carte étudiante numérique : réductions, codes promo et fidélité en Guinée.

**Description complète** :

Uny est la carte étudiante numérique des étudiants de Guinée.

🎓 Ta carte étudiante dans ta poche
Inscris-toi en 1 minute, fais vérifier ton statut étudiant et reçois ta carte Uny avec QR code.
Les partenaires la scannent pour confirmer que tu es bien étudiant.

💸 Des réductions partout
Restaurants, cafés, mode, téléphonie, formations, loisirs, santé… Choisis une offre,
obtiens ton code promo et montre-le à la caisse.

⚡ Offres flash
Des réductions limitées dans le temps et en nombre de places : sois le premier à en profiter.

⭐ Cartes de fidélité
Chaque passage chez un partenaire te rapproche d'une récompense offerte.

🏛️ Pour les établissements
Les universités et écoles suivent la vérification de leurs étudiants et leur envoient des annonces.

🏪 Pour les commerçants
Publiez vos offres, attirez une clientèle étudiante et récompensez vos clients fidèles.

Gratuit pour les étudiants.

**Catégorie** : Éducation
**Adresse e-mail de contact** : bonjour@unyafrica.com
**Site web** : https://www.unyafrica.com
**Politique de confidentialité** : https://www.unyafrica.com/confidentialite

**Visuels** : icône 512 × 512, bannière 1024 × 500 et 5 captures de téléphone (1080 × 2160).

## Sécurité des données (réponses à reporter)

- Données collectées : nom, adresse e-mail, numéro de téléphone, date de naissance, photo,
  établissement et filière (justificatif d'inscription), identifiants de compte.
- Usage : fonctionnement de l'application et gestion du compte. Aucune vente, aucune publicité.
- Données chiffrées en transit : oui. Suppression du compte sur demande : oui.

## Publier une nouvelle version de l'application

Nécessaire seulement si l'enveloppe Android change (icône, nom, couleurs) — pas pour les
changements du site. Augmenter `appVersionCode` / `appVersionName` dans `android/twa-manifest.json`
et `android/app/build.gradle`, puis :

```sh
cd android
./gradlew bundleRelease
jarsigner -keystore uny-upload.keystore -sigalg SHA256withRSA -digestalg SHA-256 \
  app/build/outputs/bundle/release/app-release.aab uny
```
