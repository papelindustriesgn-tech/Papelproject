"use client";

import { useEffect } from "react";

/** Après déconnexion : efface les pages personnelles du cache hors ligne. */
export function ClearPageCache() {
  useEffect(() => {
    navigator.serviceWorker?.controller?.postMessage("clear-pages");
  }, []);
  return null;
}
