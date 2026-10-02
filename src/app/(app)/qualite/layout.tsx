import Link from "next/link";
import { exigerEspace } from "@/lib/auth/session";

const SOUS_MENU = [
  { href: "/qualite", libelle: "Tableau de bord" },
  { href: "/qualite/controles", libelle: "Contrôles" },
  { href: "/qualite/non-conformites", libelle: "Non-conformités" },
  { href: "/qualite/tracabilite", libelle: "Traçabilité" },
  { href: "/qualite/listes", libelle: "Critères et listes" },
];

/** Espace Qualité (QHSE). Revérifie les droits en base à chaque requête. */
export default async function LayoutQualite({ children }: { children: React.ReactNode }) {
  await exigerEspace("qualite");
  return (
    <>
      <nav aria-label="Qualité" className="mb-4 flex flex-wrap gap-2 print:hidden">
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
