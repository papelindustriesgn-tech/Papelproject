"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { APPARENCE_APPLI } from "./applications";

/**
 * Chaque service a sa couleur d'interface : on redéfinit la gamme « papel » (variables CSS de Tailwind)
 * à partir de la couleur de l'application courante. Barre de menus, boutons, liens, liserés suivent automatiquement.
 */
export function ThemeAppli({ children }: { children: ReactNode }) {
  const code = usePathname().split("/")[1] ?? "";
  const couleur = APPARENCE_APPLI[code]?.couleur;
  if (!couleur) return <>{children}</>;
  const mix = (autre: string, part: number) => `color-mix(in srgb, ${couleur} ${100 - part}%, ${autre})`;
  const style = {
    "--color-papel-50": mix("white", 93),
    "--color-papel-100": mix("white", 85),
    "--color-papel-200": mix("white", 70),
    "--color-papel-300": mix("white", 50),
    "--color-papel-500": mix("white", 18),
    "--color-papel-600": mix("white", 8),
    "--color-papel-700": couleur,
    "--color-papel-800": mix("black", 20),
    "--color-papel-900": mix("black", 40),
  } as CSSProperties;
  return (
    <div style={style} className="contents">
      {children}
    </div>
  );
}
