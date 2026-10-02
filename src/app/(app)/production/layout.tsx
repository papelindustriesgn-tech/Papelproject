import Link from "next/link";
import { exigerEspace } from "@/lib/auth/session";

const SOUS_MENU = [
  { href: "/production", libelle: "Tableau de bord" },
  { href: "/production/fiches", libelle: "Fiches de poste" },
  { href: "/production/ordres", libelle: "Ordres de fabrication" },
  { href: "/production/demandes", libelle: "Demandes d'achat" },
  { href: "/production/listes", libelle: "Listes de référence" },
];

/** Espace Production. Revérifie les droits en base à chaque requête. */
export default async function LayoutProduction({ children }: { children: React.ReactNode }) {
  await exigerEspace("production");
  return (
    <>
      <nav aria-label="Production" className="mb-4 flex flex-wrap gap-2">
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
