import Link from "next/link";
import { exigerEspace } from "@/lib/auth/session";

const SOUS_MENU = [
  { href: "/magasin", libelle: "Tableau de bord" },
  { href: "/magasin/articles", libelle: "Articles" },
  { href: "/magasin/bobines", libelle: "Bobines" },
  { href: "/magasin/mouvements", libelle: "Mouvements" },
  { href: "/magasin/inventaires", libelle: "Inventaires" },
  { href: "/magasin/demandes", libelle: "Demandes d'achat" },
  { href: "/magasin/non-conformites", libelle: "Non-conformités" },
  { href: "/magasin/listes", libelle: "Listes de référence" },
];

/** Espace Magasin (stocks). Revérifie les droits en base à chaque requête. */
export default async function LayoutMagasin({ children }: { children: React.ReactNode }) {
  await exigerEspace("magasin");
  return (
    <>
      <nav aria-label="Magasin" className="mb-4 flex flex-wrap gap-2">
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
