"use client";

import { useEffect } from "react";
import { trackView } from "@/lib/actions/engagement";

/** Enregistre une consultation (statistiques admin), sans bloquer l'affichage. */
export function ViewTracker({ kind, id }: { kind: "deal" | "job" | "housing" | "marketplace"; id: string }) {
  useEffect(() => {
    const t = setTimeout(() => void trackView(kind, id), 800);
    return () => clearTimeout(t);
  }, [kind, id]);
  return null;
}
