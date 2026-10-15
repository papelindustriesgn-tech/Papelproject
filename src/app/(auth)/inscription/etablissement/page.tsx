import type { Metadata } from "next";
import Link from "next/link";
import { getCities } from "@/lib/cities";
import { createPublicClient } from "@/lib/supabase/public";
import { AccountTypeTabs } from "@/components/auth/account-type-tabs";
import { UniversityApplicationForm } from "@/app/(public)/universites/application-form";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Créer l'espace de mon établissement",
  description:
    "Universités, instituts et écoles : créez votre espace Uny pour confirmer les inscriptions et écrire à vos étudiants.",
};

export default async function UniversitySignUpPage() {
  const [cities, { data: universities }] = await Promise.all([
    getCities(),
    createPublicClient().from("universities").select("id, name").eq("is_active", true).order("name"),
  ]);
  return (
    <>
      <AccountTypeTabs current="etablissement" />
      <h1 className="text-3xl font-extrabold tracking-tight">Votre établissement sur Uny 🏛️</h1>
      <p className="text-muted mt-2">
        Gratuit. Confirmez les inscriptions, créez la carte étudiante à vos couleurs et écrivez à vos étudiants.
      </p>
      <div className="mt-6">
        <UniversityApplicationForm universities={universities ?? []} cities={cities} />
      </div>
      <p className="text-muted mt-8 text-center text-sm">
        Déjà un compte ?{" "}
        <Link href="/connexion?next=/universite" className="text-brand-600 font-bold hover:underline">
          Se connecter
        </Link>
      </p>
    </>
  );
}
