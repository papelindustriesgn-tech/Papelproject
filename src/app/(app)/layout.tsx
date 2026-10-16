import { Suspense } from "react";
import { BandeauSucces } from "@/components/coque/bandeau-succes";
import { MenuLateral } from "@/components/coque/menu-lateral";
import { ThemeAppli } from "@/components/coque/theme-appli";
import { espacesAccessibles, LIBELLES_ROLES } from "@/lib/auth/espaces";
import { exigerConnexion } from "@/lib/auth/session";
import { seDeconnecter } from "@/app/connexion/actions";
import { chargerPastilles } from "@/lib/alertes/espaces";

/** Coque commune à toutes les applications : menu latéral (barre en haut sur téléphone), contenu sur fond doux. */
export default async function CoqueApplication({ children }: LayoutProps<"/">) {
  const u = await exigerConnexion();
  const applis = espacesAccessibles(u.roles).map((e) => ({ code: e.code, libelle: e.libelle }));
  const nomComplet = `${u.prenom} ${u.nom}`.trim();
  const initiales = ((u.prenom[0] ?? "") + (u.nom[0] ?? "")).toUpperCase() || "?";
  // Pastilles rouges du menu (alertes et tâches reçues de chaque application) : calculées sans bloquer l'affichage.
  const badges = chargerPastilles(applis.map((a) => a.code)).catch(() => ({}));

  return (
    <ThemeAppli>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Suspense fallback={<div className="h-14 bg-papel-700 lg:hidden print:hidden" />}>
          <MenuLateral
            applis={applis}
            utilisateur={{ nomComplet, initiales, roles: u.roles.map((r) => LIBELLES_ROLES[r]).join(", ") || "Aucun rôle", estAdmin: u.roles.includes("admin") }}
            deconnexion={seDeconnecter}
            badges={badges}
          />
        </Suspense>
        <main className="mx-auto w-full min-w-0 max-w-[1500px] flex-1 px-3 pb-10 pt-4 md:px-6 lg:pt-6 print:p-0">
          <Suspense>
            <BandeauSucces />
          </Suspense>
          {children}
        </main>
      </div>
    </ThemeAppli>
  );
}
