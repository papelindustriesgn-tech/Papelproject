import { Suspense } from "react";
import { BandeauSucces } from "@/components/coque/bandeau-succes";
import { BarreNavigation } from "@/components/coque/barre-navigation";
import { ThemeAppli } from "@/components/coque/theme-appli";
import { espacesAccessibles, LIBELLES_ROLES } from "@/lib/auth/espaces";
import { exigerConnexion } from "@/lib/auth/session";
import { seDeconnecter } from "@/app/connexion/actions";

/** Coque commune à toutes les applications (à la Odoo) : barre de navigation en haut, contenu en pleine largeur. */
export default async function CoqueApplication({ children }: LayoutProps<"/">) {
  const u = await exigerConnexion();
  const applis = espacesAccessibles(u.roles).map((e) => ({ code: e.code, libelle: e.libelle }));
  const nomComplet = `${u.prenom} ${u.nom}`.trim();
  const initiales = ((u.prenom[0] ?? "") + (u.nom[0] ?? "")).toUpperCase() || "?";

  return (
    <ThemeAppli>
      <div className="flex min-h-screen flex-col">
        <Suspense fallback={<div className="h-12 bg-papel-700 print:hidden" />}>
          <BarreNavigation
            applis={applis}
            utilisateur={{ nomComplet, initiales, roles: u.roles.map((r) => LIBELLES_ROLES[r]).join(", ") || "Aucun rôle" }}
            deconnexion={seDeconnecter}
          />
        </Suspense>
        <main className="mx-auto w-full min-w-0 max-w-[1600px] flex-1 px-3 pb-8 pt-3 md:px-5 print:p-0">
          <Suspense>
            <BandeauSucces />
          </Suspense>
          {children}
        </main>
      </div>
    </ThemeAppli>
  );
}
