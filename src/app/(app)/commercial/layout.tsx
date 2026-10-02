import Link from "next/link";
import { exigerEspace } from "@/lib/auth/session";

const SOUS_MENU = [
  { href: "/commercial", libelle: "Tableau de bord et carte" },
  { href: "/commercial/visites", libelle: "Visites" },
  { href: "/commercial/planification", libelle: "Tournées et objectifs" },
  { href: "/commercial/reclamations", libelle: "Réclamations clients" },
  { href: "/commercial/listes", libelle: "Listes de référence" },
];

/** Espace du responsable commercial. */
export default async function LayoutCommercial({ children }: { children: React.ReactNode }) {
  await exigerEspace("commercial");
  return (
    <>
      <nav aria-label="Équipe commerciale" className="mb-4 flex flex-wrap gap-2">
        {SOUS_MENU.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-full border border-papel-300 bg-white px-3 py-1 text-papel-800 hover:bg-papel-50">
            {l.libelle}
          </Link>
        ))}
      </nav>
      {children}
    </>
  );
}
