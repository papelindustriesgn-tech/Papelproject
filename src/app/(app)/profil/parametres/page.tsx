import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { PageTitle } from "@/components/ui/section-header";
import { requireProfile } from "@/lib/auth";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { NotificationPrefsForm } from "./prefs-form";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const p = await requireProfile();
  return (
    <div className="mx-auto max-w-2xl animate-fade-up space-y-5">
      <div>
        <BackLink href="/profil" label="Profil" />
        <PageTitle title="Paramètres" />
      </div>
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 font-bold">Notifications</h2>
        <NotificationPrefsForm email={p.notify_email} deals={p.notify_deals} jobs={p.notify_jobs} />
      </section>
      <section className="space-y-2 rounded-[var(--radius-card)] bg-white p-5 text-sm shadow-[var(--shadow-card)]">
        <h2 className="mb-2 font-bold">Informations</h2>
        <p>
          <Link href="/conditions" className="font-semibold text-brand-600">Conditions d&apos;utilisation</Link>
        </p>
        <p>
          <Link href="/confidentialite" className="font-semibold text-brand-600">Politique de confidentialité</Link>
        </p>
        <p className="text-muted">
          Une question ou une demande de suppression de compte ? Écris-nous à{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-brand-600">{SUPPORT_EMAIL}</a>.
        </p>
        <p className="pt-2 text-xs text-muted">Uny · version pilote 1.0 · Conakry</p>
      </section>
    </div>
  );
}
