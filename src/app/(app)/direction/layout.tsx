import Link from "next/link";
import { exigerEspace } from "@/lib/auth/session";

const SOUS_MENU = [
  { href: "/direction", libelle: "Tableau de bord" },
  { href: "/direction/rapport", libelle: "Rapport hebdomadaire" },
];

export default async function LayoutDirection({ children }: { children: React.ReactNode }) {
  await exigerEspace("direction");
  return (
    <>
      <nav aria-label="Direction" className="mb-4 flex flex-wrap gap-2 print:hidden">
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
