import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { clientServeur } from "@/lib/supabase/serveur";
import { ESPACES, peutAcceder, type Role } from "./espaces";

export interface UtilisateurConnecte {
  id: string;
  identifiant: string;
  nom: string;
  prenom: string;
  roles: Role[];
}

/**
 * Utilisateur connecté, avec ses rôles LUS EN BASE (et non dans le jeton, qui peut dater).
 * Mis en cache pour la durée d'une requête.
 */
export const utilisateurConnecte = cache(async (): Promise<UtilisateurConnecte | null> => {
  const supabase = await clientServeur();
  // getClaims vérifie la signature du jeton localement (clés asymétriques) : pas d'aller-retour vers le serveur Auth.
  const { data: auth } = await supabase.auth.getClaims();
  const id = auth?.claims?.sub;
  if (!id) return null;

  const [{ data: profil }, { data: roles }] = await Promise.all([
    supabase.from("profils").select("identifiant, nom, prenom, actif").eq("id", id).maybeSingle(),
    supabase.rpc("mes_roles"),
  ]);
  if (!profil || !profil.actif) return null;

  return {
    id,
    identifiant: profil.identifiant,
    nom: profil.nom,
    prenom: profil.prenom,
    roles: (roles ?? []) as Role[],
  };
});

/** Exige une session ; sinon renvoie vers la connexion. */
export async function exigerConnexion(): Promise<UtilisateurConnecte> {
  const u = await utilisateurConnecte();
  if (!u) redirect("/connexion");
  return u;
}

/** Exige l'accès à un espace ; sinon page « accès refusé ». */
export async function exigerEspace(code: string): Promise<UtilisateurConnecte> {
  const u = await exigerConnexion();
  const espace = ESPACES.find((e) => e.code === code);
  if (!espace || !peutAcceder(espace, u.roles)) redirect("/acces-refuse");
  return u;
}

/** Réglages des services et paramètres : réservés à l'administrateur (décision de la direction). */
export async function exigerAdministrateur(): Promise<UtilisateurConnecte> {
  const u = await exigerConnexion();
  if (!u.roles.includes("admin")) redirect("/acces-refuse");
  return u;
}

/** Vrai si l'utilisateur connecté a le rôle Administrateur (pour afficher un message clair plutôt qu'une redirection). */
export async function estAdministrateur(): Promise<boolean> {
  return (await exigerConnexion()).roles.includes("admin");
}
