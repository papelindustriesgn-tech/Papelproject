"use client";

import dynamic from "next/dynamic";

/** Carte chargée uniquement dans le navigateur (Leaflet n'existe pas côté serveur). */
export const CarteDynamique = dynamic(() => import("./carte").then((m) => m.Carte), {
  ssr: false,
  loading: () => <p className="text-gray-700">Chargement de la carte…</p>,
});
