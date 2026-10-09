import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { BarChart } from "@/components/admin/bar-chart";
import { getAdminStats } from "@/lib/admin-stats";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Vue d'ensemble" };

export default async function AdminHome() {
  await requireAdmin(); // le layout et la page sont rendus en parallèle
  const s = await getAdminStats();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Vue d&apos;ensemble</h1>
        <p className="text-muted text-sm">
          Chiffres réels : les comptes de test ({s.test_accounts.toLocaleString("fr-FR")}) sont exclus.
        </p>
      </div>
      {s.verifications_pending > 0 && (
        <Link
          href="/admin/verifications"
          className="bg-mango-50 text-mango-700 ring-mango-100 flex items-center justify-between gap-3 rounded-[var(--radius-card)] p-4 font-semibold ring-1"
        >
          {s.verifications_pending} justificatif{s.verifications_pending > 1 ? "s" : ""} en attente de vérification
          <ArrowRight className="size-5" />
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Inscrits" value={s.users_total} tone="brand" />
        <StatCard
          label="Étudiants vérifiés"
          value={s.users_verified}
          hint={s.users_total ? `${Math.round((s.users_verified / s.users_total) * 100)} % des inscrits` : undefined}
          tone="mint"
        />
        <StatCard label="Inscriptions du jour" value={s.signups_today} />
        <StatCard label="Inscriptions (7 j)" value={s.signups_week} />
        <StatCard label="Utilisateurs actifs (7 j)" value={s.active_week} />
        <StatCard label="Vérifications en attente" value={s.verifications_pending} tone="mango" />
      </div>
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 font-bold">Inscriptions — 14 derniers jours</h2>
        <BarChart data={s.signups_by_day} label="Inscriptions par jour sur 14 jours" />
      </section>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Avantages actifs" value={s.deals_active} hint={`${s.partners_total} partenaires`} />
        <StatCard label="Universités partenaires" value={s.universities_partner} />
        <StatCard label="Inscriptions à confirmer" value={s.enrollments_pending} hint={`${s.enrollments_verified} confirmées`} />
        <StatCard label="Annonces marketplace" value={s.marketplace_active} hint={`${s.marketplace_total} au total`} />
      </div>
    </div>
  );
}
