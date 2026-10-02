import { redirect } from "next/navigation";
import { accueilPour } from "@/lib/auth/espaces";
import { utilisateurConnecte } from "@/lib/auth/session";

/** Accueil : renvoie chaque utilisateur vers son espace (le proxy le fait déjà, ceci est un filet de sécurité). */
export default async function Accueil() {
  const u = await utilisateurConnecte();
  redirect(u ? accueilPour(u.roles) : "/connexion");
}
