import type { Metadata } from "next";
import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { SignUpForm } from "./signup-form";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Créer mon compte",
  description: "Inscription gratuite en moins de 3 minutes. Obtiens ta carte étudiante digitale Uny.",
};

export default async function SignUpPage() {
  const supabase = createPublicClient();
  const [{ data: universities }, { data: cities }] = await Promise.all([
    supabase.from("universities").select("id, name, short_name, city_id").eq("is_active", true).order("name"),
    supabase.from("cities").select("id, name, is_active").eq("country_code", "GN").order("is_active", { ascending: false }).order("name"),
  ]);

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Rejoins Uny 🎓</h1>
      <p className="mt-2 text-muted">Gratuit, en moins de 3 minutes. Ta carte étudiante digitale t&apos;attend.</p>
      <div className="mt-6">
        <SignUpForm universities={universities ?? []} cities={cities ?? []} />
      </div>
      <p className="mt-8 text-center text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-bold text-brand-600 hover:underline">
          Se connecter
        </Link>
      </p>
    </>
  );
}
