import type { Metadata } from "next";
import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { SignUpForm } from "./signup-form";
import { AccountTypeTabs } from "@/components/auth/account-type-tabs";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Créer mon compte",
  description:
    "Inscription gratuite en 1 minute. Obtiens ta carte étudiante numérique Uny et des réductions chez nos partenaires.",
};

export default async function SignUpPage() {
  const supabase = createPublicClient();
  const { data: universities } = await supabase
    .from("universities")
    .select("id, name, short_name")
    .eq("is_active", true)
    .order("name");

  return (
    <>
      <AccountTypeTabs current="etudiant" />
      <h1 className="text-3xl font-extrabold tracking-tight">Rejoins Uny 🎓</h1>
      <p className="text-muted mt-2">
        Gratuit, en 1 minute. Ta carte étudiante numérique te donne des réductions chez nos partenaires.
      </p>
      <div className="mt-6">
        <SignUpForm universities={universities ?? []} />
      </div>
      <p className="text-muted mt-8 text-center text-sm">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="text-brand-600 font-bold hover:underline">
          Se connecter
        </Link>
      </p>
    </>
  );
}
