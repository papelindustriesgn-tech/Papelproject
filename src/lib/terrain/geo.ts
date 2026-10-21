/**
 * Géolocalisation du terrain : distance entre deux points GPS et évaluation d'un check-in
 * (même règle que la base : distance ≤ rayon ET précision ≤ précision maximale).
 * La base recalcule et fait foi (PostGIS) ; ce calcul sert à prévenir le commercial immédiatement.
 */

export interface PointGps {
  latitude: number;
  longitude: number;
}

const RAYON_TERRE_M = 6_371_008.8;
const rad = (d: number) => (d * Math.PI) / 180;

/** Distance en mètres (formule de haversine). */
export function distanceMetres(a: PointGps, b: PointGps): number {
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAYON_TERRE_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type ResultatCheckin =
  | { statut: "dans_zone"; distanceM: number }
  | { statut: "hors_zone"; distanceM: number }
  | { statut: "imprecis"; precisionM: number }
  | { statut: "nouveau_pva" };

export function evaluerCheckin(
  position: PointGps & { precisionM: number },
  pva: PointGps | null,
  regles: { rayonM: number; precisionMaxM: number },
): ResultatCheckin {
  if (position.precisionM > regles.precisionMaxM) return { statut: "imprecis", precisionM: position.precisionM };
  if (!pva) return { statut: "nouveau_pva" };
  const d = distanceMetres(position, pva);
  return d <= regles.rayonM ? { statut: "dans_zone", distanceM: d } : { statut: "hors_zone", distanceM: d };
}

/** Lit la position du téléphone (GPS haute précision). */
export function lirePosition(delaiMs = 20_000): Promise<PointGps & { precisionM: number }> {
  return new Promise((resoudre, rejeter) => {
    if (!("geolocation" in navigator)) return rejeter(new Error("Ce téléphone ne permet pas la géolocalisation."));
    navigator.geolocation.getCurrentPosition(
      (p) => resoudre({ latitude: p.coords.latitude, longitude: p.coords.longitude, precisionM: Math.round(p.coords.accuracy) }),
      (e) =>
        rejeter(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? "Autorisez la localisation pour Papel ERP dans les réglages du téléphone."
              : e.code === e.TIMEOUT
                ? "Le GPS ne répond pas : sortez à découvert et réessayez."
                : "Position GPS indisponible.",
          ),
        ),
      { enableHighAccuracy: true, timeout: delaiMs, maximumAge: 0 },
    );
  });
}
