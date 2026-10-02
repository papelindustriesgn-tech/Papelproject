import Link from "next/link";
import { exigerEspace } from "@/lib/auth/session";

const SOUS_MENU = [
  { href: "/logistique", libelle: "Tableau de bord" },
  { href: "/logistique/tournees", libelle: "Tournées" },
  { href: "/logistique/tournees/nouvelle", libelle: "Nouvelle tournée" },
  { href: "/logistique/listes", libelle: "Véhicules, chauffeurs et listes" },
];

/** Espace Logistique. Revérifie les droits en base à chaque requête. */
export default async function LayoutLogistique({ children }: { children: React.ReactNode }) {
  await exigerEspace("logistique");
  return (
    <>
      <nav aria-label="Logistique" className="mb-4 flex flex-wrap gap-2 print:hidden">
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
