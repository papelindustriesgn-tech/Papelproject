import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Uny — Le passeport étudiant",
    short_name: "Uny",
    description: "Carte étudiante digitale, réductions et marketplace.",
    start_url: "/accueil?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f5fb",
    theme_color: "#5733f0",
    lang: "fr",
    categories: ["education", "lifestyle", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Ma carte", url: "/carte", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Avantages", url: "/avantages", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
