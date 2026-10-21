# Publication sur Google Play et l'App Store

Mis à jour le 21 octobre 2026. Exigences vérifiées ce jour sur les pages officielles (liens en bas de page).

## 1. Chaîne officielle par plateforme

| Plateforme | Projet publié | Identifiant | Signature | Ne pas publier |
|---|---|---|---|---|
| **Google Play** | `android/` (Trusted Web Activity) | `com.unyafrica.app` | clé de téléversement `uny-upload.keystore` (SHA-256 `D6:0B:09:…:6B:96`), puis Signature Google Play | `mobile/android` (Capacitor, même identifiant) |
| **App Store** | `mobile/ios` (Capacitor) | `com.unyafrica.app` | certificat Apple Distribution du compte Apple Developer | — |

Le workflow `.github/workflows/mobile.yml` construit exactement ces deux projets.

Pourquoi une TWA pour Android : le domaine est vérifié par Google (`/.well-known/assetlinks.json`), les liens d'email
(confirmation, mot de passe oublié) s'ouvrent dans l'application, le moteur Chrome gère caméra, retour arrière et
mises à jour de sécurité.

## 2. Exigences vérifiées

| Exigence | État |
|---|---|
| Google Play : nouvelles applications ciblant **Android 16 (API 36)** depuis le 31 août 2026 | ✅ `targetSdkVersion 36`, `compileSdk 36` (AAB reconstruit le 21/10) |
| Google Play : compte **personnel** récent → test fermé **12 testeurs, 14 jours** avant la production | à prévoir si compte personnel ; non requis pour un compte organisation (D-U-N-S) |
| Google Play : suppression de compte dans l'app **et** lien web | ✅ Profil → Sécurité ; https://www.unyafrica.com/supprimer-mon-compte |
| Apple 5.1.1(v) : suppression du compte dans l'app | ✅ Profil → Sécurité |
| Apple 1.2 (contenus des utilisateurs) : filtrage, signalement, blocage, contact | ✅ signalement + masquage automatique à 3 signalements, blocage, file de modération, règles publiées (`/regles-marketplace`), contact support |
| Apple 3.1.1 / 3.1.3(e) : paiements | ✅ voir § 5 (aucun achat numérique) |
| iOS : textes d'usage caméra et photos (`Info.plist`) | ✅ présents |
| Permissions Android | ✅ aucune permission sensible (notifications désactivées tant qu'elles ne sont pas utilisées) |

## 3. Risque Apple 4.2 (« site reconditionné »)

L'app iOS charge le site. Apple peut refuser une application « pas assez app ». Ce qui a été ajouté pour réduire ce
risque, sans garantie d'acceptation :

- **Carte hors ligne native** : la carte est enregistrée sur le téléphone et affichée sans réseau, avec sa date
  d'actualisation (le partenaire vérifie toujours en ligne avant une réduction).
- Écran de démarrage, barre d'état, écran hors ligne, liens externes ouverts hors de l'app, portrait.
- Liens universels préparés (`/.well-known/apple-app-site-association`, actifs avec `APPLE_TEAM_ID`) : à compléter
  dans Xcode (capacité « Associated Domains » : `applinks:www.unyafrica.com`).

Pistes si Apple refuse : scanner QR natif pour les caissiers, notifications push (consentement, préférences,
désinscription et suppression du jeton à la déconnexion à prévoir), widget « Ma carte ».

## 4. Inventaire des données (déclarations « Sécurité des données » et « App Privacy »)

| Donnée | Collectée | Usage | Partagée avec | Liée à l'identité |
|---|---|---|---|---|
| Nom, prénom, email, téléphone, date de naissance | oui | compte, carte | établissement (si approuvé et déclaré), partenaire (nom seulement) | oui |
| Photo (facultative), justificatifs | oui | carte, vérification | équipe Uny (justificatifs) | oui |
| Établissement, filière, niveau, matricule | oui | vérification, carte | établissement concerné | oui |
| Annonces, photos d'annonces, candidatures | oui | marketplace, jobs | autres utilisateurs (annonce) | oui |
| Codes promo, vérifications en caisse, fidélité, paiements déclarés (montant, référence) | oui | réductions, statistiques du partenaire | partenaire concerné | oui |
| Mesure d'audience et de performance (Vercel Analytics, Speed Insights) | oui, sans cookie publicitaire | statistiques agrégées | Vercel (sous-traitant) | non |
| Localisation précise, contacts, données de santé, identifiant publicitaire | **non** | — | — | — |

- Chiffrement en transit : oui (HTTPS). Suppression sur demande : oui (dans l'app et sur le web).
- Pas de vente de données, pas de publicité ciblée, pas de suivi entre applications (pas d'ATT nécessaire).
- SDK des applications : Capacitor (App, Preferences, SplashScreen, StatusBar) ; TWA : android-browser-helper.

## 5. Paiements

| Paiement | Nature | Règle |
|---|---|---|
| Codes promo et offres partenaires (restaurants, formations, boutiques…) | biens et services consommés hors de l'app, payés au commerçant (espèces ou Orange Money) | Apple 3.1.3(e) / Google : paiement hors achat intégré autorisé ; Uny n'encaisse rien |
| Marketplace entre étudiants | biens physiques, paiement entre personnes | idem |
| Abonnement étudiant (50 000 GNF/mois) | **seulement une question du questionnaire**, rien n'est vendu | si un jour il débloque des fonctions de l'app : achat intégré obligatoire (Apple 3.1.1, Google Play Billing) |

Aucun système de paiement n'a été ajouté.

## 6. Dossier de soumission

- [ ] Compte Google Play Console (organisation avec D-U-N-S, ou personnel + test fermé 12 × 14 jours).
- [ ] Compte Apple Developer (99 $/an), Mac avec Xcode, ou secrets App Store Connect pour le workflow.
- [ ] AAB signé `uny-1.0.0.aab` (API 36) → Play Console ; ajouter l'empreinte de la **clé de signature Google
      Play** dans `public/.well-known/assetlinks.json` après le premier envoi.
- [ ] Build iOS archivé et envoyé sur TestFlight (workflow `mobile.yml` avec les secrets Apple).
- [ ] Captures issues de l'application réelle : téléphone (1080 × 2160 pour Play ; 6,9" et 6,5" pour Apple).
- [ ] Support : bonjour@unyafrica.com · Confidentialité : https://www.unyafrica.com/confidentialite ·
      Suppression : https://www.unyafrica.com/supprimer-mon-compte · Règles : https://www.unyafrica.com/regles-marketplace
- [ ] Classification : questionnaire IARC (Play) et âge Apple → contenus des utilisateurs modérés, pas de jeux
      d'argent, pas de contenu sexuel ; attendu « 12+ » (Apple) à cause de la marketplace entre utilisateurs.
- [ ] Comptes de revue : `scripts/create-review-accounts.mts` (étudiant vérifié + caissier du partenaire de
      démonstration, marqués comptes de test, mots de passe passés en variables d'environnement, jamais dans le dépôt).
- [ ] Instructions pour les équipes de revue (à coller dans les notes de revue) :
      1. Se connecter avec le compte étudiant → **Ma carte** : carte « Étudiant vérifié » et QR code.
      2. **Avantages** → offre « Démo » de Burger Corner → **Obtenir mon code** (aucun paiement).
      3. Se connecter avec le compte caissier sur un second appareil (ou après déconnexion) → **Scanner** →
         saisir le code promo → **Confirmer l'utilisation**. Le résultat s'affiche immédiatement.
      4. Marketplace : **Signaler l'annonce** et **Bloquer le vendeur** sur n'importe quelle annonce d'un étudiant.
      5. **Profil → Sécurité → Supprimer mon compte**.
- [ ] Tests internes : Google Play « Test interne » puis « Test fermé » ; TestFlight interne puis externe.

## 7. À vérifier sur appareil

Bouton retour Android, encoches et zones de sécurité iPhone, clavier sur les formulaires, refus puis autorisation de
la caméra (message et saisie manuelle), ouverture de WhatsApp et des liens externes, mot de passe oublié depuis
l'email puis retour dans l'application, carte hors ligne en mode avion.

Sources : [Google Play – API cible](https://developer.android.com/google/play/requirements/target-sdk) ·
[Google Play – test des comptes personnels](https://support.google.com/googleplay/android-developer/answer/14151465) ·
[App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
