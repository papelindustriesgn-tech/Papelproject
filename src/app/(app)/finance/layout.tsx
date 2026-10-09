import Link from "next/link";
import { exigerEspace } from "@/lib/auth/session";

const SOUS_MENU = [
  { href: "/finance", libelle: "Tableau de bord" },
  { href: "/finance/tresorerie", libelle: "Trésorerie" },
  { href: "/finance/fournisseurs", libelle: "Fournisseurs et charges" },
  { href: "/finance/resultat", libelle: "Résultat" },
  { href: "/finance/previsionnel", libelle: "Prévisionnel" },
  { href: "/finance/exports", libelle: "Exports comptables" },
  { href: "/finance/listes", libelle: "Comptes et listes" },
];

/** Espace Finance (comptabilité). Revérifie les droits en base à chaque requête. */
export default async function LayoutFinance({ children }: { children: React.ReactNode }) {
  await exigerEspace("finance");
  return (
    <>
      <nav aria-label="Finance" className="mb-4 flex flex-wrap gap-2 print:hidden">
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
