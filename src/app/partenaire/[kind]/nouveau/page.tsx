import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { EntityForm } from "@/components/admin/entity-form";
import { getCities } from "@/lib/cities";
import { requirePartner } from "@/lib/partner";
import { isPartnerKind, PARTNER_ENTITIES } from "@/lib/partner-entities";
import { savePartnerEntity } from "../../actions";

export const metadata = { title: "Publier" };

export default async function NewPartnerEntity({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isPartnerKind(kind)) notFound();
  const { profile, partner } = await requirePartner();
  const cfg = PARTNER_ENTITIES[kind];
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="animate-fade-up mx-auto max-w-2xl">
      <BackLink href={`/partenaire/${kind}`} label={cfg.plural} />
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">Nouveau : {cfg.singular}</h1>
      <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <EntityForm
          fields={cfg.fields}
          initial={{
            valid_from: today,
            rooms: 1,
            category: kind === "offres" ? partner.category : undefined,
            city_id: partner.city_id,
            status: "active",
            condition: "neuf",
          }}
          action={savePartnerEntity.bind(null, kind, null)}
          cities={await getCities()}
          uploadTo={{ bucket: "marketplace", prefix: profile.id }}
          submitLabel="Publier"
        />
      </div>
    </div>
  );
}
