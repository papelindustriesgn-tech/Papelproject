import Link from "next/link";
import { ArrowRight, FileSpreadsheet, Inbox } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { FormMessage } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/server";
import { requireUniversity } from "@/lib/university";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Tableau de bord" };

type Stats = {
  academic_year: string;
  pending: number;
  manual_review: number;
  verified: number;
  rejected: number;
  expired: number;
  auto_verified: number;
  cards_active: number;
  card_uses_30d: number;
  roster_size: number;
  last_import_at: string | null;
  by_faculty: { label: string; count: number }[];
};

export default async function UniversityHome() {
  const { profile, university } = await requireUniversity();
  const supabase = await createClient();
  const [{ data }, { data: branding }] = await Promise.all([
    supabase.rpc("university_stats", { p_university: university.id }),
    supabase.from("university_branding").select("university_id").eq("university_id", university.id).maybeSingle(),
  ]);
  const s = data as Stats;
  const toReview = s.pending + s.manual_review;

  return (
    <div className="animate-fade-up space-y-6">
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Bonjour {profile.first_name} 👋</h1>
        <p className="text-muted mt-1 text-sm">
          {university.name} · année {s.academic_year}
        </p>
      </section>

      {university.partner_status === "pending" && (
        <FormMessage type="info">
          Votre établissement est en cours d&apos;approbation par l&apos;équipe Uny. Vous pouvez déjà préparer la carte et la
          fiche ; la confirmation des inscriptions sera ouverte dès l&apos;approbation.
        </FormMessage>
      )}
      {!branding && (
        <Link
          href="/universite/carte"
          className="bg-mango-50 text-mango-700 hover:bg-mango-100 flex items-center justify-between gap-3 rounded-2xl p-4 text-sm font-semibold"
        >
          Personnalisez la carte Uny de vos étudiants (logo, couleurs, champs affichés)
          <ArrowRight className="size-4 shrink-0" />
        </Link>
      )}

      <Link
        href="/universite/demandes"
        className="bg-brand-600 uny-pattern flex items-center gap-4 rounded-[var(--radius-card)] p-5 text-white shadow-[var(--shadow-float)]"
      >
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <Inbox className="size-8" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-extrabold">
            {toReview} demande{toReview > 1 ? "s" : ""} à traiter
          </span>
          <span className="text-brand-100 block text-sm">Confirmez ou refusez les inscriptions déclarées par vos étudiants.</span>
        </span>
        <ArrowRight className="size-6 shrink-0" aria-hidden />
      </Link>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Inscriptions confirmées" value={s.verified} tone="mint" hint={`${s.auto_verified} automatiquement`} />
        <StatCard label="Cartes actives" value={s.cards_active} tone="brand" />
        <StatCard label="Utilisations chez les partenaires (30 j)" value={s.card_uses_30d} />
        <StatCard
          label="Refusées / expirées"
          value={s.rejected + s.expired}
          hint={`${s.rejected} refusées · ${s.expired} expirées`}
          tone="mango"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-bold">Liste des inscrits {s.academic_year}</h2>
            <FileSpreadsheet className="text-brand-600 size-5" aria-hidden />
          </div>
          {s.roster_size > 0 ? (
            <p className="text-sm">
              <strong>{s.roster_size.toLocaleString("fr-FR")}</strong> étudiants dans la dernière liste importée
              {s.last_import_at && <> (le {formatDate(s.last_import_at)})</>}. Les demandes qui correspondent sont confirmées
              automatiquement.
            </p>
          ) : (
            <p className="text-muted text-sm">
              Aucune liste importée pour cette année. Importer la liste des inscrits (Excel ou CSV) permet de confirmer
              automatiquement les étudiants.
            </p>
          )}
          <Link href="/universite/imports" className="text-brand-600 mt-3 inline-block text-sm font-semibold">
            Gérer les listes →
          </Link>
        </section>

        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-bold">Étudiants confirmés par faculté</h2>
          {s.by_faculty.length ? (
            <ul className="space-y-2.5 text-sm">
              {s.by_faculty.map((f) => (
                <li key={f.label}>
                  <div className="flex justify-between gap-3">
                    <span className="truncate font-semibold">{f.label}</span>
                    <span className="tabular-nums">{f.count}</span>
                  </div>
                  <div className="bg-canvas mt-1 h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-brand-500 h-full rounded-full"
                      style={{ width: `${(f.count / s.by_faculty[0].count) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted text-sm">Les statistiques apparaîtront après les premières confirmations.</p>
          )}
        </section>
      </div>
      <p className="text-muted text-xs">
        🔒 Ce portail n&apos;affiche que les étudiants qui ont déclaré une inscription dans votre établissement.
      </p>
    </div>
  );
}
