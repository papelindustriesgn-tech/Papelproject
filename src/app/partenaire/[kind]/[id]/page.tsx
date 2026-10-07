import { notFound } from "next/navigation";
import { z } from "zod";
import { BackLink } from "@/components/ui/back-link";
import { EntityForm } from "@/components/admin/entity-form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { createClient } from "@/lib/supabase/server";
import { getCities } from "@/lib/cities";
import { requirePartner } from "@/lib/partner";
import { isPartnerKind, PARTNER_ENTITIES } from "@/lib/partner-entities";
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


  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-5">
      <BackLink href={`/partenaire/${kind}`} label={cfg.plural} />
      <h1 className="text-2xl font-extrabold tracking-tight">Modifier : {cfg.singular}</h1>


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
