import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarClock, ExternalLink, Mail, MapPin, Wallet } from "lucide-react";
import { z } from "zod";
import { BackLink } from "@/components/ui/back-link";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { DemoBanner } from "@/components/ui/demo-banner";
import { FavoriteButton } from "@/components/content/favorite-button";
import { ViewTracker } from "@/components/content/view-tracker";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { JOB_TYPES } from "@/lib/constants";
import { daysUntil, formatDate, timeAgo } from "@/lib/format";
import { ApplyForm } from "./apply-form";
import { withdrawApplication } from "../actions";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const job = await load((await params).id);
  return { title: job ? `${job.title} — ${job.company_name}` : "Opportunité" };
}

export default async function JobPage({ params }: Props) {
  const { id } = await params;
  const [job, profile] = await Promise.all([load(id), requireProfile()]);
  if (!job) notFound();
  const supabase = await createClient();
  const [{ data: fav }, { data: application }] = await Promise.all([
    supabase.from("job_favorites").select("job_id").eq("job_id", id).eq("user_id", profile.id).maybeSingle(),
    supabase.from("job_applications").select("id, created_at").eq("job_id", id).eq("user_id", profile.id).maybeSingle(),
  ]);
  const t = JOB_TYPES[job.type];
  const left = daysUntil(job.deadline);
  const closed = left !== null && left < 0;

  return (
    <article className="animate-fade-up mx-auto max-w-3xl">
      <ViewTracker kind="job" id={job.id} />
      <BackLink href="/jobs" label="Jobs & opportunités" />
      <header className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-4">
          <span className="bg-brand-50 flex size-14 shrink-0 items-center justify-center rounded-2xl text-2xl" aria-hidden>
            {t.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">{job.title}</h1>
            <p className="text-muted font-semibold">{job.company_name}</p>
          </div>
          <FavoriteButton kind="job" id={job.id} initial={!!fav} className="ring-line shrink-0 shadow-none ring-1" />
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Badge>{t.label}</Badge>
          {job.is_remote && <Badge tone="mint">À distance possible</Badge>}
          {job.is_demo && <DemoBadge />}
        </div>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <MapPin className="text-brand-600 size-4 shrink-0" aria-hidden />
            <dd>{job.location ?? "Conakry"}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="text-brand-600 size-4 shrink-0" aria-hidden />
            <dd>{job.compensation ?? "Non précisée"}</dd>
          </div>
          <div className="flex items-center gap-2">
            <CalendarClock className="text-brand-600 size-4 shrink-0" aria-hidden />
            <dd className={left !== null && left <= 7 ? "text-coral-600 font-semibold" : ""}>
              {job.deadline ? `Jusqu'au ${formatDate(job.deadline)}` : "Sans date limite"}
            </dd>
          </div>
        </dl>
        <p className="text-muted mt-3 text-xs">Publiée {timeAgo(job.created_at)}</p>
      </header>

      {job.is_demo && (
        <div className="mt-4">
          <DemoBanner what="annonce" />
        </div>
      )}

      <section className="mt-5 space-y-5 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div>
          <h2 className="font-bold">Description</h2>
          <p className="text-ink/80 mt-1 leading-relaxed whitespace-pre-line">{job.description || "—"}</p>
        </div>
        {job.skills.length > 0 && (
          <div>
            <h2 className="font-bold">Compétences recherchées</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {job.skills.map((s) => (
                <li key={s} className="bg-canvas ring-line rounded-full px-3 py-1.5 text-sm font-semibold ring-1">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section id="candidater" className="mt-5 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 text-lg font-extrabold">Candidater</h2>
        {application ? (
          <div className="space-y-3">
            <p className="bg-mint-50 text-mint-700 rounded-2xl p-4 text-sm font-semibold">
              ✅ Candidature envoyée {timeAgo(application.created_at)}.
            </p>
            <form action={withdrawApplication.bind(null, job.id)}>
              <button className="text-muted hover:text-coral-600 text-sm font-semibold underline">Retirer ma candidature</button>
            </form>
          </div>
        ) : closed ? (
          <p className="text-muted text-sm">Les candidatures sont closes pour cette annonce.</p>
        ) : (
          <>
            {job.is_demo && (
              <p className="text-muted mb-3 text-sm">
                Annonce de démonstration : ta candidature sera enregistrée dans Uny pour tester le parcours, mais aucune
                entreprise ne la recevra.
              </p>
            )}
            <ApplyForm jobId={job.id} firstName={profile.first_name} />
            {(job.apply_url || job.apply_email) && !job.is_demo && (
              <div className="border-line mt-4 flex flex-wrap gap-2 border-t pt-4 text-sm">
                <span className="text-muted">Tu peux aussi postuler directement :</span>
                {job.apply_url && (
                  <a
                    href={job.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 inline-flex items-center gap-1 font-semibold"
                  >
                    Site de l&apos;entreprise <ExternalLink className="size-3.5" />
                  </a>
                )}
                {job.apply_email && (
                  <a
                    href={`mailto:${job.apply_email}?subject=${encodeURIComponent(`Candidature — ${job.title}`)}`}
                    className="text-brand-600 inline-flex items-center gap-1 font-semibold"
                  >
                    <Mail className="size-3.5" /> {job.apply_email}
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </article>
  );
}
