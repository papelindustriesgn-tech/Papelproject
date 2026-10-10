"use client";

/**
 * Carte légère (Leaflet) : points colorés, sans images d'icônes à télécharger.
 * Fond de carte : tuiles OpenStreetMap par défaut, ou NEXT_PUBLIC_TUILES_URL (fournisseur conseillé en production).
 */
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

export interface PointCarte {
  id: string;
  latitude: number;
  longitude: number;
  libelle: string;
  detail?: string;
  /** Couleur du point (catégorie fixe, ex. par commercial ou par statut). */
  couleur: string;
  /** Point « creux » (ex. check-in hors zone). */
  creux?: boolean;
}

const TUILES = process.env.NEXT_PUBLIC_TUILES_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const CONAKRY: [number, number] = [9.5716, -13.6476];

function echapper(t: string) {
  return t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function Carte({ points, hauteur = 360, onSelection }: { points: PointCarte[]; hauteur?: number; onSelection?: (id: string) => void }) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<import("leaflet").Map | null>(null);
  const couche = useRef<import("leaflet").LayerGroup | null>(null);

  useEffect(() => {
    let annule = false;
    void import("leaflet").then((L) => {
      if (annule || !conteneur.current || carte.current) return;
      carte.current = L.map(conteneur.current).setView(CONAKRY, 12);
      L.tileLayer(TUILES, { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(carte.current);
      couche.current = L.layerGroup().addTo(carte.current);
    });
    return () => {
      annule = true;
      carte.current?.remove();
      carte.current = null;
      couche.current = null;
    };
  }, []);

  useEffect(() => {
    let annule = false;
    const dessiner = () =>
      void import("leaflet").then((L) => {
        if (annule) return;
        if (!couche.current || !carte.current) {
          window.setTimeout(dessiner, 100);
          return;
        }
        couche.current.clearLayers();
        const valides = points.filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
        for (const p of valides) {
          const m = L.circleMarker([p.latitude, p.longitude], {
            radius: 8,
            color: p.creux ? p.couleur : "#ffffff",
            weight: p.creux ? 3 : 2,
            fillColor: p.couleur,
            fillOpacity: p.creux ? 0.15 : 0.95,
          }).bindPopup(`<strong>${echapper(p.libelle)}</strong>${p.detail ? `<br>${echapper(p.detail)}` : ""}`);
          if (onSelection) m.on("click", () => onSelection(p.id));
          m.addTo(couche.current);
        }
        if (valides.length) carte.current.fitBounds(L.latLngBounds(valides.map((p) => [p.latitude, p.longitude] as [number, number])), { padding: [24, 24], maxZoom: 16 });
      });
    dessiner();
    return () => {
      annule = true;
    };
  }, [points, onSelection]);

  return <div ref={conteneur} style={{ height: hauteur }} className="z-0 w-full overflow-hidden rounded-md border border-gray-200" role="region" aria-label="Carte" />;
}
