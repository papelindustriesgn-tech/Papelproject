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

/** Icône et couleur de chaque application (écran d'accueil et barre de navigation). Ordre de couleur fixe. */
export const APPARENCE_APPLI: Record<string, { Icone: LucideIcon; couleur: string }> = {
  direction: { Icone: LayoutDashboard, couleur: "#07524d" },
  magasin: { Icone: Boxes, couleur: "#d9731c" },
  production: { Icone: Factory, couleur: "#4f5fb8" },
  ventes: { Icone: Receipt, couleur: "#1f8a5b" },
  terrain: { Icone: MapPinned, couleur: "#0b84a5" },
  commercial: { Icone: Users, couleur: "#8a4baf" },
  achats: { Icone: Ship, couleur: "#b8433a" },
  logistique: { Icone: Truck, couleur: "#b7791f" },
  qualite: { Icone: ClipboardCheck, couleur: "#13867a" },
  maintenance: { Icone: Wrench, couleur: "#52677a" },
  finance: { Icone: Landmark, couleur: "#2f6db3" },
  admin: { Icone: Settings, couleur: "#3d4a56" },
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
