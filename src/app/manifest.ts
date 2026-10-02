import type { MetadataRoute } from "next";

/** Manifeste de l'application installable (Android : « Ajouter à l'écran d'accueil »). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Papel ERP – Terrain",
    short_name: "Papel",
    description: "Application des commerciaux Papel : points de vente, visites, devis et factures, même sans réseau.",
    start_url: "/terrain",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07524d",
    theme_color: "#07524d",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
