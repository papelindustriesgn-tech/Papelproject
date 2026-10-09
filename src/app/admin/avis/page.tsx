import Link from "next/link";
import { Download, Mail, Phone } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/cn";
import { param, type SearchParams } from "@/lib/url";
import {
  BENEFIT_TYPES,
  PARTNER_DISCOUNT,
  PARTNER_EXPECTATION_LABELS,
  SURVEY_CATEGORIES,
  SURVEY_MIN_VERSION,
  SURVEY_PAYMENT,
  SURVEY_UNDERSTOOD,
  SURVEY_WOULD_USE,
  type Option,
} from "@/lib/survey";
import { getPartnerSurveyResponses, getSurveyResponses, universityOf } from "@/lib/survey-results";

export const metadata = { title: "Avis des inscrits" };

function Bars({ title, rows, total }: { title: string; rows: { label: string; count: number }[]; total: number }) {
  return (
    <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
      <h2 className="mb-3 font-bold">{title}</h2>
      <ul className="space-y-2.5">
        {rows.map((r) => {
          const pct = total ? Math.round((r.count / total) * 100) : 0;
          return (
            <li key={r.label}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{r.label}</span>
                <span className="text-muted shrink-0 tabular-nums">
                  {r.count} · {pct} %
                </span>
              </div>
              <div className="bg-canvas mt-1 h-2 overflow-hidden rounded-full">
                <div className="bg-brand-500 h-full rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Répartition d'une question (choix unique ou multiple) ; les choix multiples sont triés par popularité. */
function tally<T>(list: readonly Option[], rows: T[], get: (r: T) => string[] | string | null, sort = true) {
  const out = list.map((o) => ({
    label: o.label,
    count: rows.filter((r) => {
      const v = get(r);
      return Array.isArray(v) ? v.includes(o.value) : v === o.value;
    }).length,
  }));
  return sort ? out.sort((a, b) => b.count - a.count) : out;
}

const share = <T,>(rows: T[], pred: (r: T) => boolean) =>
  rows.length ? `${Math.round((rows.filter(pred).length / rows.length) * 100)} %` : "—";

function Empty({ text }: { text: React.ReactNode }) {
  return <p className="text-muted rounded-[var(--radius-card)] bg-white p-8 text-center shadow-[var(--shadow-card)]">{text}</p>;
}

function ExportLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      download
      className="bg-brand-600 hover:bg-brand-700 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white sm:w-auto"
    >
      <Download className="size-4" aria-hidden /> Exporter (Excel / CSV)
    </a>
  );
}

async function StudentResults() {
  const supabase = await createClient();
  const [all, { count: users }] = await Promise.all([
    getSurveyResponses(),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_test_account", false)
      .in("role", ["student", "admin"]),
  ]);
  const responses = all.filter((r) => r.version >= SURVEY_MIN_VERSION);
  const n = responses.length;
  const old = all.length - n;
  const rate = users ? Math.round((n / users) * 100) : 0;
  const comments = responses.filter((r) => r.missing || r.partners);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Réponses" value={n} hint={`${rate} % des ${users ?? 0} inscrits`} tone="brand" />
        <StatCard label="Ont compris le projet" value={share(responses, (r) => r.understood === "oui")} tone="mint" />
        <StatCard label="Utiliseraient Uny" value={share(responses, (r) => r.would_use === "oui")} tone="mango" />
        <StatCard label="Acceptent d'être contactés" value={responses.filter((r) => r.contact_ok).length} />
      </div>
      {old > 0 && (
        <p className="text-muted text-sm">
          {old} réponse{old > 1 ? "s" : ""} à l&apos;ancien questionnaire (incluses dans l&apos;export) : ces inscrits voient une
          invitation à répondre au nouveau.
        </p>
      )}

      {n === 0 ? (
        <Empty
          text={
            <>
              Aucune réponse au nouveau questionnaire pour l&apos;instant. Les inscrits voient l&apos;invitation sur leur page
              d&apos;accueil ; tu peux aussi partager le lien <strong>/avis</strong> sur WhatsApp.
            </>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <Bars
              title="Ont compris à quoi sert Uny"
              rows={tally(SURVEY_UNDERSTOOD, responses, (r) => r.understood, false)}
              total={n}
            />
            <Bars
              title="Domaines où ils veulent des réductions"
              rows={tally(SURVEY_CATEGORIES, responses, (r) => r.categories)}
              total={n}
            />
            <Bars
              title="Utiliseraient Uny pour leurs réductions"
              rows={tally(SURVEY_WOULD_USE, responses, (r) => r.would_use, false)}
              total={n}
            />
            <Bars title="Moyen de paiement préféré" rows={tally(SURVEY_PAYMENT, responses, (r) => r.payment_pref)} total={n} />
          </div>

          <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-bold">Idées pour améliorer Uny ({comments.length})</h2>
            <ul className="divide-line mt-3 divide-y">
              {comments.map((r) => (
                <li key={r.user_id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold">
                      {r.profile.first_name} {r.profile.last_name}
                    </span>
                    <span className="text-muted">{universityOf(r)}</span>
                    {r.contact_ok && (
                      <span className="text-mint-700 ml-auto flex flex-wrap gap-3 text-xs font-semibold">
                        {r.profile.phone && (
                          <a href={`tel:${r.profile.phone}`} className="flex items-center gap-1">
                            <Phone className="size-3.5" aria-hidden /> {r.profile.phone}
                          </a>
                        )}
                        {r.profile.email && (
                          <a href={`mailto:${r.profile.email}`} className="flex min-w-0 items-center gap-1 break-all">
                            <Mail className="size-3.5 shrink-0" aria-hidden /> {r.profile.email}
                          </a>
                        )}
                      </span>
                    )}
                  </div>
                  {r.missing && (
                    <p className="mt-1 break-words whitespace-pre-line">
                      <span className="text-muted">Idée : </span>
                      {r.missing}
                    </p>
                  )}
                  {r.partners && (
                    <p className="mt-1 break-words whitespace-pre-line">
                      <span className="text-muted">Enseignes : </span>
                      {r.partners}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}

async function PartnerResults() {
  const supabase = await createClient();
  const [responses, { count: partners }] = await Promise.all([
    getPartnerSurveyResponses(),
    supabase.from("partners").select("id", { count: "exact", head: true }).eq("is_active", true).eq("is_demo", false),
  ]);
  const n = responses.length;
  const comments = responses.filter((r) => r.comments);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Réponses" value={n} hint={`sur ${partners ?? 0} partenaires actifs`} tone="brand" />
        <StatCard label="Ont compris le projet" value={share(responses, (r) => r.understood === "oui")} tone="mint" />
        <StatCard
          label="Offrent 20 % ou plus"
          value={share(responses, (r) => ["20_30", "plus_30"].includes(r.discount_range))}
          tone="mango"
        />
        <StatCard label="Idées envoyées" value={comments.length} />
      </div>

      {n === 0 ? (
        <Empty
          text={
            <>
              Aucune réponse pour l&apos;instant. Les partenaires voient l&apos;invitation sur leur tableau de bord ; le lien
              direct est <strong>/partenaire/avis</strong>.
            </>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <Bars
              title="Ont compris comment Uny leur amène des clients"
              rows={tally(SURVEY_UNDERSTOOD, responses, (r) => r.understood, false)}
              total={n}
            />
            <Bars
              title="Avantages qu'ils peuvent offrir"
              rows={tally(BENEFIT_TYPES, responses, (r) => r.offer_types)}
              total={n}
            />
            <Bars
              title="Réduction possible"
              rows={tally(PARTNER_DISCOUNT, responses, (r) => r.discount_range, false)}
              total={n}
            />
            <Bars
              title="Ce qu'ils attendent d'Uny"
              rows={tally(PARTNER_EXPECTATION_LABELS, responses, (r) => r.expectations)}
              total={n}
            />
          </div>

          <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-bold">Idées des partenaires ({comments.length})</h2>
            <ul className="divide-line mt-3 divide-y">
              {comments.map((r) => (
                <li key={r.partner_id} className="py-3 text-sm">
                  <p className="font-semibold">
                    {r.partner?.name}{" "}
                    <span className="text-muted font-normal">
                      · {r.partner?.district ?? r.partner?.city?.name ?? "Guinée"}
                      {r.author && ` · ${r.author.first_name} ${r.author.last_name}`}
                    </span>
                  </p>
                  <p className="mt-1 break-words whitespace-pre-line">{r.comments}</p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}

export default async function SurveyResultsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin(); // le layout et la page sont rendus en parallèle
  const tab = param(await searchParams, "type") === "partenaires" ? "partenaires" : "etudiants";
  const tabs = [
    { key: "etudiants", label: "🎓 Étudiants", href: "/admin/avis" },
    { key: "partenaires", label: "🤝 Partenaires", href: "/admin/avis?type=partenaires" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Avis des inscrits</h1>
          <p className="text-muted text-sm">
            Attentes en matière d&apos;avantages : étudiants (invitation sur l&apos;accueil) et partenaires (invitation sur leur
            tableau de bord). Comptes de test exclus.
          </p>
        </div>
        <ExportLink href={tab === "partenaires" ? "/admin/avis/export?type=partenaires" : "/admin/avis/export"} />
      </div>

      <nav aria-label="Questionnaires" className="bg-canvas ring-line grid grid-cols-2 gap-1 rounded-2xl p-1 ring-1 sm:max-w-sm">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "rounded-xl px-3 py-2 text-center text-sm font-bold transition",
              tab === t.key ? "text-ink bg-white shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "partenaires" ? <PartnerResults /> : <StudentResults />}
    </div>
  );
}
