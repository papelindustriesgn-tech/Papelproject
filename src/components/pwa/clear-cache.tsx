"use client";

import { useEffect } from "react";
import { forgetNativeCard } from "@/components/card/native-card-cache";

/** Après déconnexion : efface les pages personnelles du cache hors ligne. */
export function ClearPageCache() {
  useEffect(() => {
    navigator.serviceWorker?.controller?.postMessage("clear-pages");
    forgetNativeCard();
    try {
      localStorage.removeItem("uny_cache_owner");
    } catch {}
  }, []);
  return null;
}
