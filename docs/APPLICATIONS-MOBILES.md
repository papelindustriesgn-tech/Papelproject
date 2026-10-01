# Applications Android et iOS — Uny

Le dossier `mobile/` contient les applications natives **Android** (Google Play) et **iOS** (App Store), construites avec [Capacitor](https://capacitorjs.com).
Elles affichent le site Uny en production dans une application installable, avec icône, écran de démarrage, barre d'état aux couleurs d'Uny et écran « Pas de connexion ».
Une seule application sert aux **étudiants** et aux **partenaires** : selon le compte connecté, elle ouvre l'espace étudiant ou l'espace partenaire, avec le scanner de cartes. L'accès à la caméra est demandé au premier scan (Android et iOS).

**Conséquence pratique** : toute amélioration du site est visible **immédiatement** dans les applications, sans republier sur les stores. On ne republie que pour changer l'icône, le nom, l'adresse du site ou les réglages natifs.

| | |
| --- | --- |
| Nom | Uny |
| Identifiant (Android `applicationId` / iOS Bundle ID) | `com.unyafrica.app` (définitif après la première publication) |
| Adresse chargée | `mobile/www/app-url.json` → actuellement `https://uny-sepia.vercel.app` |
| Appareils | Android 7+ ; iPhone (iOS 15+), portrait |

## Ce que tu dois créer (à ton nom — je ne peux pas le faire à ta place)

| Compte | Prix | Délai | Lien |
| --- | --- | --- | --- |
| **Google Play Console** | 25 $ une seule fois | 1 à 3 jours (vérification d'identité) | https://play.google.com/console/signup |
| **Apple Developer Program** | 99 $ / an | 1 à 2 jours (personne) ; plus long pour une entreprise (numéro **D-U-N-S** obligatoire) | https://developer.apple.com/programs/enroll/ |

Conseil : inscris-toi en tant qu'**organisation** (Papel Industries) si la société est immatriculée. C'est le nom affiché sous l'app dans les stores.
Pour Google Play, un compte **personnel** récent doit faire tester l'app par **12 testeurs pendant 14 jours** avant de publier ; un compte **organisation** n'a pas cette obligation.

## 1. Avant la publication : le domaine

Achète `unyafrica.com` et relie-le à Vercel (voir [DEPLOIEMENT.md](DEPLOIEMENT.md) §4), puis :

1. `mobile/www/app-url.json` → `{ "url": "https://unyafrica.com" }`
2. Commit + push : GitHub Actions reconstruit les deux applications.

Les stores refusent souvent une app dont la politique de confidentialité et le support sont sur une adresse `vercel.app`.

## 2. Google Play

### 2.1 Clé de signature (une seule fois, à conserver précieusement)

Sur n'importe quel ordinateur avec Java :

```bash
keytool -genkeypair -v -keystore uny-upload.keystore -alias uny -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 uny-upload.keystore > keystore.txt     # macOS : base64 -i uny-upload.keystore
```

Dans GitHub → dépôt → *Settings → Secrets and variables → Actions*, ajoute :

| Secret | Valeur |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | contenu de `keystore.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | mot de passe du keystore |
| `ANDROID_KEY_ALIAS` | `uny` |
| `ANDROID_KEY_PASSWORD` | mot de passe de la clé |

Garde une copie du fichier `.keystore` et des mots de passe hors de GitHub (coffre-fort de mots de passe). Avec *Play App Signing* (activé par défaut), Google peut réinitialiser cette clé si elle est perdue.

### 2.2 Récupérer l'application

GitHub → onglet **Actions** → *Applications mobiles* → dernière exécution → **Artifacts** → `uny-android` :

- `app-debug.apk` : à installer directement sur un téléphone Android pour tester (autoriser « sources inconnues ») ;
- `app-release.aab` : le fichier à envoyer sur Google Play (signé si les secrets sont en place).

### 2.3 Fiche Play Store

Play Console → *Créer une application* → Nom **Uny**, langue **Français**, *Application*, *Gratuite*. Puis :

- **Politique de confidentialité** : `https://unyafrica.com/confidentialite`
- **Suppression du compte** (obligatoire) : l'app permet de supprimer son compte dans *Profil → Sécurité → Supprimer mon compte*. URL web à déclarer : `https://unyafrica.com/confidentialite#suppression-du-compte`
- **Sécurité des données** : données collectées = nom, email, téléphone, date de naissance, photos (profil, justificatif, annonces), identifiants utilisateur ; toutes chiffrées en transit ; non vendues ; suppression possible par l'utilisateur.
- **Public cible** : 18 ans et plus (étudiants).
- **Accès à l'application** : fournir deux comptes de démonstration (un étudiant vérifié, un partenaire) pour les testeurs de Google.
- **Visuels** : icône 512 × 512 (`mobile/assets/icon-only.png`, redimensionnée), bannière 1024 × 500, au moins 2 captures d'écran de téléphone.
- *Tests → Test interne* : envoyer `app-release.aab`, tester, puis *Production*.

## 3. App Store (iPhone)

L'app iOS est compilée sur les Mac de GitHub Actions : **aucun Mac n'est nécessaire**.

### 3.1 Une fois le compte Apple Developer actif

1. https://developer.apple.com/account → *Identifiers* → **+** → App IDs → Bundle ID `com.unyafrica.app`, description « Uny ».
2. https://appstoreconnect.apple.com → *Apps* → **+** → Nouvelle app : iOS, nom **Uny**, langue Français, Bundle ID `com.unyafrica.app`, SKU `uny-ios`.
3. *Utilisateurs et accès → Intégrations → App Store Connect API* → générer une clé avec le rôle **App Manager**. Télécharger le fichier `.p8` (une seule fois possible).
4. Secrets GitHub :

| Secret | Valeur |
| --- | --- |
| `APPSTORE_API_KEY_P8` | contenu complet du fichier `AuthKey_XXXX.p8` |
| `APPSTORE_API_KEY_ID` | Key ID affiché à côté de la clé |
| `APPSTORE_ISSUER_ID` | Issuer ID affiché en haut de la page |
| `APPLE_TEAM_ID` | Team ID (developer.apple.com → *Membership*) |

5. GitHub → *Actions* → *Applications mobiles* → **Run workflow**. L'app est signée et envoyée sur **TestFlight** (10 à 30 min de traitement chez Apple).

### 3.2 Fiche App Store

- Captures d'écran iPhone 6,9" (1320 × 2868) — au moins 3.
- Description, mots-clés, URL de support et de confidentialité.
- **Confidentialité de l'app** : mêmes données que pour Google (liées à l'identité, non utilisées pour le suivi publicitaire).
- **Informations pour la vérification** : un compte étudiant **vérifié** et un compte **partenaire** (email + mot de passe), avec une note qui explique l'app : carte étudiante, avantages, jobs, logement, marketplace, et pour les commerçants publication d'offres et scan des cartes.
- Classification d'âge : répondre « Oui » à *contenu généré par les utilisateurs* (marketplace) ; la modération est en place dans l'admin et le signalement se fait par email.

### 3.3 Point d'attention Apple (règle 4.2)

Apple refuse parfois les apps qui « ne sont qu'un site web ». Ce qui plaide pour Uny : compte personnel, carte étudiante avec QR code consultable en mode présentation, **scanner de cartes par la caméra pour les partenaires**, appareil photo pour les justificatifs et annonces, écran hors ligne, parcours complet dans l'app (inscription, vérification, suppression du compte). Si Apple demande plus de fonctionnalités natives, les prochaines à ajouter sont les **notifications push** (nouvelle offre, statut vérifié) et la **carte dans Apple Wallet**.

## Développement

```bash
cd mobile
npm install
npm run assets     # régénère icônes et écrans de démarrage (Android + iOS)
npx cap sync       # après toute modification de capacitor.config.ts ou de www/
npx cap open android   # Android Studio (Windows/macOS/Linux)
npx cap open ios       # Xcode (macOS uniquement)
```

Avant chaque nouvelle version envoyée aux stores : le numéro de build est automatique (numéro d'exécution GitHub) ; changer `versionName` (Android, `android/app/build.gradle`) et `MARKETING_VERSION` (iOS, dans Xcode) pour afficher « 1.1.0 », etc.

L'application ajoute `UnyApp` à l'identifiant du navigateur : le site ouvre alors directement l'espace étudiant (connexion ou tableau de bord) au lieu de la page vitrine.
