import { notFound } from "next/navigation";
import { z } from "zod";
import { BackLink } from "@/components/ui/back-link";
import { EntityForm } from "@/components/admin/entity-form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { VerificationBadge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getCities } from "@/lib/cities";
import { requirePartner } from "@/lib/partner";
import { isPartnerKind, PARTNER_ENTITIES } from "@/lib/partner-entities";
import { formatDate, whatsappLink } from "@/lib/format";
import { deletePartnerEntity, savePartnerEntity } from "../../actions";

export const metadata = { title: "Modifier" };

export default async function EditPartnerEntity({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (!isPartnerKind(kind) || !z.uuid().safeParse(id).success) notFound();
  const { profile, partner } = await requirePartner();
  const cfg = PARTNER_ENTITIES[kind];
  const supabase = await createClient();

  let initial: Record<string, unknown> | null = null;
  if (kind === "boutique") {
    const { data } = await supabase
      .from("marketplace_items")
      .select("*, images:marketplace_images(url, position)")
      .eq("id", id)
      .eq("partner_id", partner.id)
      .maybeSingle();
    if (data) initial = { ...data, images: [...(data.images ?? [])].sort((a, b) => a.position - b.position).map((i) => i.url) };
  } else {
    const { data } = await supabase.from(cfg.table).select("*").eq("id", id).eq("partner_id", partner.id).maybeSingle();
    initial = data as Record<string, unknown> | null;
  }
  if (!initial) notFound();

  const applications = kind === "jobs" ? ((await supabase.rpc("partner_job_applications", { p_job: id })).data ?? []) : null;

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-5">
      <BackLink href={`/partenaire/${kind}`} label={cfg.plural} />
      <h1 className="text-2xl font-extrabold tracking-tight">Modifier : {cfg.singular}</h1>

      {applications && (
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-bold">Candidatures reçues ({applications.length})</h2>
          {applications.length === 0 ? (
            <p className="text-muted text-sm">Aucune candidature pour le moment.</p>
          ) : (
            <ul className="divide-line divide-y text-sm">
              {applications.map((a) => (
                <li key={a.id} className="space-y-1 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {a.first_name} {a.last_name}
                    </span>
                    <VerificationBadge status={a.verification_status} />
                  </div>
                  <p className="text-muted">{[a.field_of_study, a.study_level, a.university].filter(Boolean).join(" · ")}</p>
                  <p className="whitespace-pre-line">{a.message}</p>
                  <p className="flex flex-wrap gap-3 text-xs font-semibold">
                    {a.phone && (
                      <a href={whatsappLink(a.phone)} target="_blank" rel="noopener noreferrer" className="text-mint-700">
                        WhatsApp {a.phone}
                      </a>
                    )}
                    {a.email && (
                      <a href={`mailto:${a.email}`} className="text-brand-600 break-all">
                        {a.email}
                      </a>
                    )}
                    <span className="text-muted">{formatDate(a.created_at)}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <EntityForm
          fields={cfg.fields}
          initial={initial}
          action={savePartnerEntity.bind(null, kind, id)}
          cities={await getCities()}
          uploadTo={{ bucket: "marketplace", prefix: profile.id }}
          submitLabel="Enregistrer"
        />
      </div>

      <form
        action={deletePartnerEntity.bind(null, kind, id)}
        className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]"
      >
        <h2 className="text-coral-600 font-bold">Supprimer</h2>
        <p className="text-muted mt-1 text-sm">La suppression est définitive.</p>
        <ConfirmButton
          message="Supprimer définitivement ?"
          className="bg-coral-50 text-coral-600 hover:bg-coral-500 mt-3 h-10 rounded-xl px-4 text-sm font-semibold hover:text-white"
        >
          Supprimer
        </ConfirmButton>
      </form>
    </div>
  );
}
