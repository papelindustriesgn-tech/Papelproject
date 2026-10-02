"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ROLES, type Role } from "@/lib/auth/espaces";
import { emailTechnique, schemaIdentifiant, schemaMotDePasse } from "@/lib/auth/identifiant";
import { exigerEspace } from "@/lib/auth/session";
import { erreursZod, messageErreurBase, valeursFormulaire, type EtatFormulaire } from "@/lib/formulaires/etat";
import { clientAdminAuth } from "@/lib/supabase/admin";
import { clientServeur } from "@/lib/supabase/serveur";

const schemaRoles = z.array(z.enum(ROLES)).min(1, "Choisissez au moins un rôle.");

const schemaCreation = z.object({
  identifiant: schemaIdentifiant,
  nom: z.string().trim().min(1, "Le nom est obligatoire.").max(80),
  prenom: z.string().trim().max(80),
  telephone: z.string().trim().max(30),
  motDePasse: schemaMotDePasse,
  roles: schemaRoles,
});

/** Contrôle commun : seul un admin ou la Direction gère les comptes ; seul la Direction gère le rôle Direction. */
async function verifierGestionnaire(rolesConcernes: readonly Role[] = []) {
  const u = await exigerEspace("admin");
  if (!u.roles.includes("admin") && !u.roles.includes("direction")) throw new Error("Droits insuffisants.");
  if (rolesConcernes.includes("direction") && !u.roles.includes("direction")) {
    return { u, erreur: "Seule la Direction peut attribuer ou retirer le rôle Direction." };
  }
  return { u, erreur: null };
}

export async function creerUtilisateur(_e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  const valeurs = valeursFormulaire(fd);
  const lecture = schemaCreation.safeParse({ ...valeurs, roles: fd.getAll("roles") });
  if (!lecture.success) return { erreurs: erreursZod(lecture.error), valeurs };
  const d = lecture.data;

  const { erreur } = await verifierGestionnaire(d.roles);
  if (erreur) return { message: erreur, valeurs };

  const admin = clientAdminAuth();
  const { data: cree, error } = await admin.auth.admin.createUser({
    email: emailTechnique(d.identifiant),
    password: d.motDePasse,
    email_confirm: true,
    user_metadata: { identifiant: d.identifiant, nom: d.nom, prenom: d.prenom, telephone: d.telephone || null },
  });
  if (error || !cree.user) {
    const doublon = error?.code === "email_exists" || error?.message?.includes("already");
    return { message: doublon ? "Cet identifiant est déjà utilisé." : "Création du compte impossible.", valeurs };
  }

  // Attribution des rôles avec le jeton de l'appelant : la RLS contrôle à nouveau les droits.
  const supabase = await clientServeur();
  const { error: errRoles } = await supabase
    .from("utilisateur_roles")
    .insert(d.roles.map((role) => ({ utilisateur_id: cree.user.id, role })));
  if (errRoles) {
    await admin.auth.admin.deleteUser(cree.user.id); // annulation : pas de compte sans rôle
    return { message: messageErreurBase(errRoles), valeurs };
  }

  revalidatePath("/admin/utilisateurs");
  return { ok: true, message: `Compte « ${d.identifiant} » créé.` };
}

export async function modifierRoles(utilisateurId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  const lecture = schemaRoles.safeParse(fd.getAll("roles"));
  if (!lecture.success) return { erreurs: erreursZod(lecture.error) };
  const voulus = new Set(lecture.data);

  const supabase = await clientServeur();
  const { data: actuels, error } = await supabase.from("utilisateur_roles").select("role").eq("utilisateur_id", utilisateurId);
  if (error) return { message: messageErreurBase(error) };
  const existants = new Set((actuels ?? []).map((r) => r.role as Role));

  const aAjouter = [...voulus].filter((r) => !existants.has(r));
  const aRetirer = [...existants].filter((r) => !voulus.has(r));
  const { erreur } = await verifierGestionnaire([...aAjouter, ...aRetirer]);
  if (erreur) return { message: erreur };

  if (aAjouter.length) {
    const { error: e } = await supabase.from("utilisateur_roles").insert(aAjouter.map((role) => ({ utilisateur_id: utilisateurId, role })));
    if (e) return { message: messageErreurBase(e) };
  }
  if (aRetirer.length) {
    const { error: e } = await supabase.from("utilisateur_roles").delete().eq("utilisateur_id", utilisateurId).in("role", aRetirer);
    if (e) return { message: messageErreurBase(e) };
  }
  revalidatePath("/admin/utilisateurs");
  return { ok: true, message: "Rôles enregistrés. Ils s'appliquent à la prochaine connexion de l'utilisateur (au plus tard sous une heure)." };
}

export async function changerActivation(utilisateurId: string, actif: boolean): Promise<void> {
  const { u } = await verifierGestionnaire();
  if (utilisateurId === u.id && !actif) throw new Error("Vous ne pouvez pas désactiver votre propre compte.");
  const supabase = await clientServeur();
  const { error } = await supabase.from("profils").update({ actif }).eq("id", utilisateurId);
  if (error) throw new Error(messageErreurBase(error));
  // Bloque aussi la connexion côté Auth (et la débloque à la réactivation).
  await clientAdminAuth().auth.admin.updateUserById(utilisateurId, { ban_duration: actif ? "none" : "876000h" });
  revalidatePath("/admin/utilisateurs");
}

export async function reinitialiserMotDePasse(utilisateurId: string, _e: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  const lecture = schemaMotDePasse.safeParse(fd.get("motDePasse"));
  if (!lecture.success) return { erreurs: { motDePasse: lecture.error.issues[0].message } };

  const supabase = await clientServeur();
  const { data: rolesCible } = await supabase.from("utilisateur_roles").select("role").eq("utilisateur_id", utilisateurId);
  const { erreur } = await verifierGestionnaire((rolesCible ?? []).map((r) => r.role as Role));
  if (erreur) return { message: "Seule la Direction peut changer le mot de passe d'un membre de la Direction." };

  const { error } = await clientAdminAuth().auth.admin.updateUserById(utilisateurId, { password: lecture.data });
  if (error) return { message: "Changement du mot de passe impossible." };
  return { ok: true, message: "Mot de passe modifié. Communiquez-le à l'utilisateur en main propre." };
}
