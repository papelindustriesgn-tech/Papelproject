"use client";

import { useEffect, useState } from "react";
import { lienPreuve } from "../../actions";

/** Affiche une preuve (signature ou photo) stockée en privé, via un lien temporaire. */
export function ImagePreuve({ chemin, alt }: { chemin: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let actif = true;
    void lienPreuve(chemin).then((u) => actif && setUrl(u));
    return () => {
      actif = false;
    };
  }, [chemin]);
  // eslint-disable-next-line @next/next/no-img-element -- lien signé temporaire, pas d'optimisation d'image
  return url ? <img src={url} alt={alt} className="max-h-48 rounded-lg border border-gray-200 bg-white" /> : <span className="text-sm text-gray-600">Chargement…</span>;
}
