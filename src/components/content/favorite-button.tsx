"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleFavorite } from "@/lib/actions/engagement";
import { cn } from "@/lib/cn";

export function FavoriteButton({
  kind,
  id,
  initial,
  className,
  withLabel = false,
}: {
  kind: "deal" | "job" | "housing";
  id: string;
  initial: boolean;
  className?: string;
  withLabel?: boolean;
}) {
  const [fav, setFav] = useState(initial);
  const [pending, start] = useTransition();
  const label = fav ? "Retirer des favoris" : "Ajouter aux favoris";
  return (
    <button
      type="button"
      aria-pressed={fav}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (pending) return;
        const next = !fav;
        setFav(next);
        start(async () => {
          const res = await toggleFavorite(kind, id, next);
          if (!res.ok) setFav(!next);
        });
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full transition active:scale-90",
        withLabel ? "h-11 border border-line bg-white px-4 text-sm font-semibold" : "size-10 bg-white/95 shadow-[var(--shadow-card)]",
        fav ? "text-coral-500" : "text-ink/70 hover:text-coral-500",
        className,
      )}
    >
      <Heart className={cn("size-5", fav && "fill-current")} aria-hidden />
      {withLabel && (fav ? "Enregistré" : "Enregistrer")}
    </button>
  );
}
