import Link from "next/link";
import { exigerEspace } from "@/lib/auth/session";

const SOUS_MENU = [
  { href: "/achats", libelle: "Tableau de bord" },
  { href: "/achats/demandes", libelle: "Demandes d'achat" },
  { href: "/achats/commandes", libelle: "Bons de commande" },
  { href: "/achats/conteneurs", libelle: "Conteneurs" },
  { href: "/achats/listes", libelle: "Fournisseurs et listes" },
];

export default async function LayoutAchats({ children }: { children: React.ReactNode }) {
  await exigerEspace("achats");
  return (
    <>
      <nav aria-label="Achats" className="mb-4 flex flex-wrap gap-2 print:hidden">
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
