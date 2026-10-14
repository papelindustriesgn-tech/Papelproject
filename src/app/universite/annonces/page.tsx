import { Megaphone } from "lucide-react";
import { requireUniversity } from "@/lib/university";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/format";
import { AnnouncementForm } from "./announcement-form";

export const metadata = { title: "Annonces aux étudiants" };

export default async function AnnouncementsPage() {
  const { university } = await requireUniversity();
  const supabase = await createClient();
  const [{ data: uni }, { data: history }, { data: reach }] = await Promise.all([
    supabase.from("universities").select("faculties").eq("id", university.id).single(),
    supabase
      .from("university_announcements")
      .select("id, title, body, audience, study_level, faculty, recipients, created_at")
      .eq("university_id", university.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.rpc("university_audience_count", { p_university: university.id, p_audience: "all" }),
  ]);

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Annonces aux étudiants</h1>
        <p className="text-muted mt-1 text-sm">
          Écrivez directement à vos étudiants : examens, inscriptions, frais, événements. L&apos;annonce arrive en notification
          dans leur application Uny. Aujourd&apos;hui, <strong className="text-ink">{reach ?? 0}</strong> de vos étudiants sont
          sur Uny.
        </p>
      </div>
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <AnnouncementForm faculties={uni?.faculties ?? []} />
      </section>
      <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 flex items-center gap-2 font-bold">
          <Megaphone className="text-brand-600 size-5" aria-hidden /> Annonces envoyées
        </h2>
        {history?.length ? (
          <ul className="divide-line divide-y">
            {history.map((a) => (
              <li key={a.id} className="py-3 text-sm" data-testid="announcement">
                <p className="font-bold">{a.title}</p>
                <p className="text-ink/80 mt-0.5 whitespace-pre-line">{a.body}</p>
                <p className="text-muted mt-1 text-xs">
                  {timeAgo(a.created_at)} · {a.recipients} destinataire{a.recipients > 1 ? "s" : ""}
                  {a.audience === "verified" && " · inscriptions confirmées"}
                  {a.study_level && ` · ${a.study_level}`}
                  {a.faculty && ` · ${a.faculty}`}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted text-sm">Aucune annonce pour le moment.</p>
        )}
      </section>
    </div>
  );
}
