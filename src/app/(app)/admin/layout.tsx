import Link from "next/link";
import { exigerEspace } from "@/lib/auth/session";

const SOUS_MENU = [
  { href: "/admin/utilisateurs", libelle: "Utilisateurs" },
  { href: "/admin/parametres", libelle: "Paramètres" },
  { href: "/admin/produits", libelle: "Produits et prix" },
  { href: "/admin/taux-change", libelle: "Taux de change" },
  { href: "/admin/listes", libelle: "Listes de référence" },
  { href: "/admin/journal", libelle: "Journal d'audit" },
];

/** Espace Administration : réservé aux administrateurs et à la Direction. */
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  await exigerEspace("admin");
  return (
    <>
      <nav aria-label="Administration" className="mb-4 flex flex-wrap gap-2">
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
