import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BandeauSucces } from "@/components/coque/bandeau-succes";
import { Navigation } from "@/components/coque/navigation";
import { espacesAccessibles, LIBELLES_ROLES } from "@/lib/auth/espaces";
import { exigerConnexion } from "@/lib/auth/session";
import { seDeconnecter } from "@/app/connexion/actions";

/** Coque commune à tous les espaces : en-tête, menu limité aux espaces autorisés, déconnexion. */
export default async function CoqueApplication({ children }: LayoutProps<"/">) {
  const u = await exigerConnexion();
  const liens = espacesAccessibles(u.roles).map((e) => ({ href: `/${e.code}`, libelle: e.libelle }));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-3 bg-papel-700 px-4 py-2 text-white print:hidden">
        <Link href="/" className="flex items-center gap-2" aria-label="Accueil Papel ERP">
          <Image src="/logo-papel.png" alt="" width={72} height={41} />
          <span className="hidden font-semibold sm:inline">ERP</span>
        </Link>
        <div className="flex items-center gap-3 text-right">
          <div className="leading-tight">
            <div className="font-semibold">
              {u.prenom} {u.nom}
            </div>
            <div className="text-sm text-papel-100">{u.roles.map((r) => LIBELLES_ROLES[r]).join(", ") || "Aucun rôle"}</div>
          </div>
          <form action={seDeconnecter}>
            <button className="min-h-11 rounded-lg border border-papel-300 px-3 text-sm font-semibold hover:bg-papel-800">Déconnexion</button>
          </form>
        </div>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="border-b border-gray-200 bg-white p-2 md:w-56 md:border-b-0 md:border-r print:hidden">
          <Navigation liens={liens} />
        </aside>
        <main className="w-full min-w-0 max-w-6xl flex-1 p-4 print:p-0">
          <Suspense>
            <BandeauSucces />
          </Suspense>
          {children}
        </main>
      </div>
    </div>
  );
}
