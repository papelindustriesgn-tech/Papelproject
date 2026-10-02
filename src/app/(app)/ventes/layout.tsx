import Link from "next/link";
import { exigerEspace } from "@/lib/auth/session";

const SOUS_MENU = [
  { href: "/ventes", libelle: "Tableau de bord" },
  { href: "/ventes/clients", libelle: "Clients" },
  { href: "/ventes/pieces?type=devis", libelle: "Devis" },
  { href: "/ventes/pieces?type=commande", libelle: "Commandes" },
  { href: "/ventes/pieces?type=facture", libelle: "Factures" },
  { href: "/ventes/pieces?type=avoir", libelle: "Avoirs" },
  { href: "/ventes/impayes", libelle: "Impayés" },
  { href: "/ventes/dotations", libelle: "Dotations" },
  { href: "/ventes/listes", libelle: "Listes de référence" },
];

/** Espace Ventes (comptabilité et responsable commercial). */
export default async function LayoutVentes({ children }: { children: React.ReactNode }) {
  await exigerEspace("ventes");
  return (
    <>
      <nav aria-label="Ventes" className="mb-4 flex flex-wrap gap-2 print:hidden">
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
