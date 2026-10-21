"use client";

import { useEffect } from "react";

const KEY = "uny_cache_owner";

/**
 * Changement de compte sur le même appareil (sans déconnexion explicite, session expirée…) :
 * les pages personnelles gardées hors ligne pour le compte précédent sont effacées.
 */
export function CacheOwner({ userId }: { userId: string }) {
  useEffect(() => {
    try {
      const previous = localStorage.getItem(KEY);
      if (previous !== userId) {
        navigator.serviceWorker?.controller?.postMessage("clear-pages");
        localStorage.setItem(KEY, userId);
      }
    } catch {
      // Stockage indisponible (navigation privée) : on efface par précaution
      navigator.serviceWorker?.controller?.postMessage("clear-pages");
    }
  }, [userId]);
  return null;
}
