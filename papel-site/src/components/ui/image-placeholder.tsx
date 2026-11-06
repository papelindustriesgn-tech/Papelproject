import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** Espace réservé clairement identifié lorsqu'aucune photographie réelle n'est disponible. */
export function ImagePlaceholder({ label = "Photographie à venir", className }: { label?: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-2 bg-papel-50 leaf-pattern text-papel-600",
        className,
      )}
    >
      <ImageIcon className="size-7 opacity-60" aria-hidden />
      <span className="text-xs font-medium tracking-wide uppercase opacity-80">{label}</span>
    </div>
  );
}
