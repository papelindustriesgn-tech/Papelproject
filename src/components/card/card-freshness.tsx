"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Carte affichée depuis l'appareil (hors connexion ou réseau lent) : on indique quand elle a été actualisée.
 * La carte hors ligne ne remplace pas le contrôle : le partenaire vérifie la carte et le code auprès d'Uny.
 */
export function CardFreshness({ renderedAt }: { renderedAt: string }) {
  const [stale, setStale] = useState(false);
  useEffect(() => {
    const check = () => setStale(!navigator.onLine || Date.now() - new Date(renderedAt).getTime() > 2 * 60_000);
    check();
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    return () => {
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
    };
  }, [renderedAt]);
  if (!stale) return null;
  const when = new Date(renderedAt).toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <p
      role="status"
      data-testid="card-freshness"
      className="bg-mango-50 text-ink mb-3 flex max-w-md items-start gap-2 rounded-2xl p-3 text-sm"
    >
      <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        Carte enregistrée sur ton téléphone, <strong>actualisée le {when}</strong>. Le partenaire vérifie ta carte en ligne
        avant d&apos;appliquer une réduction.
      </span>
    </p>
  );
}
