import Link from "next/link";
import { ArrowRight, CalendarClock, FileSpreadsheet, Inbox, PenLine } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { FormMessage } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/server";
import { requireUniversity, universityCan } from "@/lib/university";
import { DeclaredStudents } from "@/components/university/declared-students";
import { formatDate, isoDateInDays } from "@/lib/format";
import { param, type SearchParams } from "@/lib/url";
import { delayHint } from "@/lib/review-delay";

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

export default async function UniversityHome({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { profile, university } = await requireUniversity();
  const supabase = await createClient();
  const in30 = isoDateInDays(30);
  const [{ data }, { data: declared }, { data: branding }, { count: incompleteCount }, { count: renewCount }] = await Promise.all(
    [
      supabase.rpc("university_stats", { p_university: university.id }),
      supabase.rpc("university_declared_count", { p_university: university.id }),
      supabase.from("university_branding").select("university_id").eq("university_id", university.id).maybeSingle(),
      supabase
        .from("student_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("university_id", university.id)
        .eq("status", "incomplete"),
      supabase
        .from("student_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("university_id", university.id)
        .eq("status", "verified")
        .lte("expires_at", in30),
    ],
  );
  // Établissement en attente : aucune donnée d'étudiant, seulement des totaux à zéro
  const s: Stats = (data as Stats | null) ?? {
    academic_year: "",
    pending: 0,
    manual_review: 0,
    verified: 0,
    rejected: 0,
    expired: 0,
    auto_verified: 0,
    cards_active: 0,
    card_uses_30d: 0,
    roster_size: 0,
    last_import_at: null,
    by_faculty: [],
  };
  const toReview = s.pending + s.manual_review;
  const canRead = universityCan(university, "read");
  const actions = [
    {
      href: "/universite/demandes",
      icon: Inbox,
      count: toReview,
      label: "Dossiers à vérifier",
      hint: "Confirmer, refuser ou demander un complément",
    },
    {
      href: "/universite/etudiants?statut=a-completer",
      icon: PenLine,
      count: incompleteCount ?? 0,
      label: "Pièces ou infos manquantes",
      hint: "En attente de correction par l'étudiant",
    },
    {
      href: "/universite/etudiants?statut=a-renouveler",
      icon: CalendarClock,
      count: renewCount ?? 0,
      label: "Cartes à renouveler",
      hint: "Expirent dans les 30 jours",
    },
  ];
  const declaredCount = (declared ?? { total: 0, without_request: 0 }) as { total: number; without_request: number };

  return (
    <div className="animate-fade-up space-y-6">
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Bonjour {profile.first_name} 👋</h1>
        <p className="text-muted mt-1 text-sm">
          {university.name}
          {s.academic_year && <> · année {s.academic_year}</>}
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

      {canRead && (
        <section aria-label="À faire" className="grid gap-3 sm:grid-cols-3">
          {actions.map(({ href, icon: Icon, count, label, hint }, i) => (
            <Link
              key={href}
              href={href}
              className={
                i === 0 && count > 0
                  ? "bg-brand-600 flex items-center gap-3 rounded-[var(--radius-card)] p-4 text-white shadow-[var(--shadow-float)]"
                  : "hover:ring-brand-200 flex items-center gap-3 rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-transparent"
              }
              data-testid="university-action"
            >
              <Icon className="size-7 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-2xl font-extrabold tabular-nums">{count}</span>
                <span className="block text-sm font-bold">{label}</span>
                <span className={i === 0 && count > 0 ? "block text-xs text-white/80" : "text-muted block text-xs"}>{hint}</span>
              </span>
              <ArrowRight className="size-5 shrink-0" aria-hidden />
            </Link>
          ))}
        </section>
      )}

      {param(sp, "bienvenue") && (
        <FormMessage type="success">
          Bienvenue sur Uny 🎓 L&apos;espace de {university.name} est créé. Préparez votre fiche et votre carte, puis
          déposez le dossier de vérification (Établissement &amp; connexion) : l&apos;équipe Uny le contrôle avant
          d&apos;ouvrir l&apos;accès aux dossiers des étudiants{delayHint(" (délai indicatif : ")}{delayHint() ? ")" : ""}.
        </FormMessage>
      )}

      {declaredCount.total > 0 && (
        <DeclaredStudents
          total={declaredCount.total}
          withoutRequest={declaredCount.without_request}
          canInvite={universityCan(university, "announce")}
        />
      )}

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
      <div className="flex flex-wrap gap-2 text-sm lg:hidden">
        <Link href="/universite/carte" className="ring-line rounded-full bg-white px-4 py-2 font-semibold ring-1">
          Carte de l&apos;université
        </Link>
        <Link href="/universite/etablissement" className="ring-line rounded-full bg-white px-4 py-2 font-semibold ring-1">
          Établissement & connexion
        </Link>
      </div>
      <p className="text-muted text-xs">
        🔒 Ce portail n&apos;affiche que les étudiants qui ont déclaré une inscription dans votre établissement.
      </p>
    </div>
  );
}
