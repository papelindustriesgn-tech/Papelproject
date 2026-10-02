import Link from "next/link";
import { exigerEspace } from "@/lib/auth/session";

const SOUS_MENU = [
  { href: "/maintenance", libelle: "Tableau de bord" },
  { href: "/maintenance/interventions", libelle: "Ordres de travail" },
  { href: "/maintenance/preventif", libelle: "Préventif" },
  { href: "/maintenance/equipements", libelle: "Équipements" },
  { href: "/maintenance/listes", libelle: "Listes de référence" },
];

/** Espace Maintenance. Revérifie les droits en base à chaque requête. */
export default async function LayoutMaintenance({ children }: { children: React.ReactNode }) {
  await exigerEspace("maintenance");
  return (
    <>
      <nav aria-label="Maintenance" className="mb-4 flex flex-wrap gap-2 print:hidden">
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
