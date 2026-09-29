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
    <div className="mx-auto max-w-2xl animate-fade-up space-y-5">
      <div>
        <BackLink href="/profil" label="Profil" />
        <PageTitle title="Sécurité" subtitle="Mot de passe, email et sessions." />
      </div>
      <SecurityForms email={p.email ?? ""} />
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-bold">Sessions</h2>
        <p className="mt-1 text-sm text-muted">Tu as perdu ton téléphone ? Déconnecte ton compte de tous les appareils.</p>
        <form action={signOutEverywhere} className="mt-4">
          <button className="h-11 w-full rounded-2xl bg-coral-50 font-semibold text-coral-600 hover:bg-coral-500 hover:text-white">
            Se déconnecter de tous les appareils
          </button>
        </form>
      </section>
    </div>
  );
}
