import { StatCard } from "@/components/admin/stat-card";
import { BarChart } from "@/components/admin/bar-chart";
import { DemoCleanup } from "@/components/admin/demo-cleanup";
import { getAdminStats } from "@/lib/admin-stats";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Statistiques" };

export default async function StatsPage() {
  const s = await getAdminStats();
  const supabase = await createClient();
  const [{ data: topDeals }, { data: topJobs }, { data: unis }] = await Promise.all([
    supabase.from("deals").select("id, title, view_count, partner:partners(name)").order("view_count", { ascending: false }).limit(5),
    supabase.from("jobs").select("id, title, company_name, view_count").order("view_count", { ascending: false }).limit(5),
    supabase.from("profiles").select("university:universities(short_name, name)").eq("is_test_account", false).not("university_id", "is", null).limit(5000),
  ]);
  const byUni = new Map<string, number>();
  (unis ?? []).forEach((u) => {
    const k = u.university?.short_name ?? u.university?.name ?? "Autre";
    byUni.set(k, (byUni.get(k) ?? 0) + 1);
  });
  const uniRank = [...byUni.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Statistiques</h1>
      <section>
        <h2 className="mb-3 font-bold">Utilisateurs</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Inscrits" value={s.users_total} tone="brand" />
          <StatCard label="Nouvelles inscriptions (7 j)" value={s.signups_week} />
          <StatCard label="Actifs (7 j)" value={s.active_week} />
          <StatCard label="Comptes de test (exclus)" value={s.test_accounts} />
        </div>
      </section>
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 font-bold">Inscriptions par jour</h2>
        <BarChart data={s.signups_by_day} label="Inscriptions par jour" />
      </section>
      <section>
        <h2 className="mb-3 font-bold">Vérifications</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="En attente" value={s.verifications_pending} tone="mango" />
          <StatCard label="Validées" value={s.verifications_approved} tone="mint" />
          <StatCard label="Refusées" value={s.verifications_rejected} />
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-bold">Consultations</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Offres consultées" value={s.views_deal} />
          <StatCard label="Jobs consultés" value={s.views_job} hint={`${s.applications_total} candidatures`} />
          <StatCard label="Logements consultés" value={s.views_housing} />
          <StatCard label="Annonces marketplace vues" value={s.views_marketplace} hint={`${s.marketplace_active} annonces en ligne`} />
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-bold">Offres les plus vues</h2>
          <ol className="space-y-2 text-sm">
            {(topDeals ?? []).map((d, i) => (
              <li key={d.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{i + 1}. {d.title} <span className="text-muted">— {d.partner?.name}</span></span>
                <span className="shrink-0 font-bold tabular-nums">{d.view_count}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-bold">Jobs les plus vus</h2>
          <ol className="space-y-2 text-sm">
            {(topJobs ?? []).map((j, i) => (
              <li key={j.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{i + 1}. {j.title} <span className="text-muted">— {j.company_name}</span></span>
                <span className="shrink-0 font-bold tabular-nums">{j.view_count}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 font-bold">Inscrits par établissement</h2>
        {uniRank.length === 0 ? (
          <p className="text-sm text-muted">Pas encore de données.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {uniRank.map(([k, n]) => (
              <li key={k} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate font-semibold">{k}</span>
                <span className="h-2.5 rounded-full bg-brand-500" style={{ width: `${Math.max(4, (n / uniRank[0][1]) * 100)}%` }} />
                <span className="shrink-0 tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-bold">Données de démonstration</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Avant de présenter de vrais partenaires, supprime les partenaires, offres, jobs, logements et annonces fictifs (marqués « Démo »). Les comptes utilisateurs ne sont pas touchés.
        </p>
        <DemoCleanup />
      </section>
    </div>
  );
}
