"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { clientServeur } from "@/lib/supabase/serveur";
import { accueilPour } from "@/lib/auth/espaces";
import { emailTechnique, schemaIdentifiant } from "@/lib/auth/identifiant";
import { erreursZod, type EtatFormulaire } from "@/lib/formulaires/etat";

const schema = z.object({
  identifiant: schemaIdentifiant,
  motDePasse: z.string().min(1, "Saisissez votre mot de passe."),
});

export async function seConnecter(_etat: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  const lecture = schema.safeParse({ identifiant: fd.get("identifiant"), motDePasse: fd.get("motDePasse") });
  const identifiant = String(fd.get("identifiant") ?? "");
  if (!lecture.success) {
    return { erreurs: erreursZod(lecture.error), valeurs: { identifiant } };
  }
  const supabase = await clientServeur();
  const { error } = await supabase.auth.signInWithPassword({
    email: emailTechnique(lecture.data.identifiant),
    password: lecture.data.motDePasse,
  });
  if (error) {
    const message =
      error.code === "invalid_credentials"
        ? "Identifiant ou mot de passe incorrect."
        : "Connexion impossible pour le moment. Vérifiez le réseau et réessayez.";
    return { message, valeurs: { identifiant } };
  }
  // Redirection directe vers l'espace correspondant aux rôles (lus en base).
  const { data: roles } = await supabase.rpc("mes_roles");
  redirect(accueilPour(roles ?? []));
}

export async function seDeconnecter() {
  const supabase = await clientServeur();
  await supabase.auth.signOut();
  redirect("/connexion");
}
