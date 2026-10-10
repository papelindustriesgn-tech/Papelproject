import {
  Boxes,
  ClipboardCheck,
  Factory,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
  MapPinned,
  Receipt,
  Settings,
  Ship,
  Truck,
  Users,
  Wrench,
} from "lucide-react";

/** Icône et couleur de chaque application (écran d'accueil, barre de navigation et couleur d'interface du service). */
export const APPARENCE_APPLI: Record<string, { Icone: LucideIcon; couleur: string }> = {
  direction: { Icone: LayoutDashboard, couleur: "#07524d" },
  magasin: { Icone: Boxes, couleur: "#c2410c" },
  production: { Icone: Factory, couleur: "#4338ca" },
  ventes: { Icone: Receipt, couleur: "#15803d" },
  terrain: { Icone: MapPinned, couleur: "#0e7490" },
  commercial: { Icone: Users, couleur: "#7e22ce" },
  achats: { Icone: Ship, couleur: "#b91c1c" },
  logistique: { Icone: Truck, couleur: "#a16207" },
  qualite: { Icone: ClipboardCheck, couleur: "#0f766e" },
  maintenance: { Icone: Wrench, couleur: "#475569" },
  finance: { Icone: Landmark, couleur: "#1d4ed8" },
  admin: { Icone: Settings, couleur: "#374151" },
};

export function IconeAppli({ code, taille = 56, contour = false }: { code: string; taille?: number; contour?: boolean }) {
  const a = APPARENCE_APPLI[code] ?? APPARENCE_APPLI.admin;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[22%] text-white shadow-sm ${contour ? "ring-1 ring-white/50" : ""}`}
      style={{ width: taille, height: taille, background: `linear-gradient(145deg, ${a.couleur}, color-mix(in srgb, ${a.couleur} 75%, black))` }}
      aria-hidden
    >
      <a.Icone size={Math.round(taille * 0.5)} strokeWidth={1.8} />
    </span>
  );
}
