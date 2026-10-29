"use client";

import { CircleHelp, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

/**
 * Bulle « ? » : touchée, elle affiche l'explication d'un mot en langage courant (lexique `src/lib/aide/lexique.ts`).
 * Se ferme au deuxième toucher, à la croix, en touchant ailleurs ou avec Échap. Placée au-dessus des tuiles cliquables (z-10).
 */
export function Aide({ mot, explication, className = "" }: { mot: string; explication: string; className?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  const zone = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !zone.current?.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener("pointerdown", fermer);
    document.addEventListener("keydown", fermer);
    return () => {
      document.removeEventListener("pointerdown", fermer);
      document.removeEventListener("keydown", fermer);
    };
  }, [ouvert]);
  return (
    <span ref={zone} className={`relative z-10 inline-flex align-middle ${className}`}>
      <button
        type="button"
        aria-expanded={ouvert}
        aria-controls={id}
        aria-label={`Que veut dire « ${mot} » ?`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOuvert((o) => !o);
        }}
        className="-m-2 inline-flex size-9 items-center justify-center rounded-full text-gray-400 hover:text-papel-700 focus-visible:outline-2 focus-visible:outline-papel-600 md:size-7"
      >
        <CircleHelp size={16} aria-hidden />
      </button>
      {ouvert && (
        <span
          id={id}
          role="note"
          // Téléphone : carte en bas de l'écran (jamais coupée par le bord) ; ordinateur : bulle sous le « ? ».
          className="fixed inset-x-4 bottom-24 z-50 rounded-xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-full sm:mt-2 sm:w-64 sm:-translate-x-1/2 bg-gray-900 p-3 text-left text-sm font-normal leading-snug text-white shadow-xl"
        >
          <span className="mb-1 flex items-start justify-between gap-2 font-semibold">
            {mot}
            <button type="button" aria-label="Fermer" onClick={() => setOuvert(false)} className="-m-1 p-1 text-gray-300 hover:text-white">
              <X size={14} aria-hidden />
            </button>
          </span>
          {explication}
        </span>
      )}
    </span>
  );
}
