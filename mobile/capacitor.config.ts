import type { CapacitorConfig } from "@capacitor/cli";
import { readFileSync } from "node:fs";

/**
 * L'application charge le site Uny en production : chaque mise à jour du site
 * est immédiatement disponible dans l'app, sans republier sur les stores.
 * L'adresse est dans www/app-url.json (lue aussi par l'écran hors ligne) :
 * la remplacer par https://unyafrica.com une fois le domaine actif, puis `npx cap sync`.
 */
const url: string = JSON.parse(readFileSync("www/app-url.json", "utf8")).url;
const host = new URL(url).host;

const config: CapacitorConfig = {
  appId: "com.unyafrica.app",
  appName: "Uny",
  webDir: "www",
  appendUserAgent: "UnyApp",
  backgroundColor: "#f6f5fb",
  server: {
    url,
    // Pages ouvertes dans l'app ; tout autre site (WhatsApp, cartes, liens externes) s'ouvre à l'extérieur.
    allowNavigation: [host, "unyafrica.com", "www.unyafrica.com"],
    // Écran local affiché si le téléphone n'a pas de connexion au lancement.
    errorPath: "offline.html",
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "never",
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#5733f0",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      style: "DARK", // texte blanc sur fond violet
      backgroundColor: "#5733f0",
      overlaysWebView: false,
    },
  },
};

export default config;
