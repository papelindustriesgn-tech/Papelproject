import type { Metadata } from "next";
import { BackLink } from "@/components/ui/back-link";
import { PageTitle } from "@/components/ui/section-header";
import { requireProfile } from "@/lib/auth";
import { SecurityForms } from "./security-forms";
import { signOutEverywhere } from "../actions";

export const metadata: Metadata = { title: "Sécurité" };

export default async function SecurityPage() {
  const p = await requireProfile();
  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-5">
      <div>
        <BackLink href="/profil" label="Profil" />
        <PageTitle title="Sécurité" subtitle="Mot de passe, email et sessions." />
      </div>
      <SecurityForms email={p.email ?? ""} />
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-bold">Sessions</h2>
        <p className="text-muted mt-1 text-sm">Tu as perdu ton téléphone ? Déconnecte ton compte de tous les appareils.</p>
        <form action={signOutEverywhere} className="mt-4">
          <button className="bg-coral-50 text-coral-600 hover:bg-coral-500 h-11 w-full rounded-2xl font-semibold hover:text-white">
            Se déconnecter de tous les appareils
          </button>
        </form>
      </section>
    </div>
  );
}
