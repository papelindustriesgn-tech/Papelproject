import { LogOut } from "lucide-react";

/** Déconnexion dans l'en-tête mobile des espaces partenaire et université (la barre latérale n'existe que sur grand écran). */
export function MobileLogout() {
  return (
    <form action="/auth/deconnexion" method="post" className="shrink-0 lg:hidden">
      <button
        className="text-muted hover:text-ink hover:bg-canvas flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold"
        aria-label="Se déconnecter"
      >
        <LogOut className="size-4" aria-hidden /> Déconnexion
      </button>
    </form>
  );
}
