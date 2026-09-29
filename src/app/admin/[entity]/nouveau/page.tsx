import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { EntityForm } from "@/components/admin/entity-form";
import { ENTITIES, isEntity } from "@/lib/admin-entities";
import { formLookups } from "@/lib/admin-form-data";
import { saveEntity } from "../../crud-actions";

export const metadata = { title: "Ajouter" };

export default async function NewEntity({ params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  if (!isEntity(entity)) notFound();
  const cfg = ENTITIES[entity];
  const { partners, districts } = await formLookups();
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="max-w-2xl">
      <BackLink href={`/admin/${entity}`} label={cfg.plural} />
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">Nouveau {cfg.singular}</h1>
      <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <EntityForm
          fields={cfg.fields}
          initial={{ valid_from: today, rooms: 1 }}
          action={saveEntity.bind(null, entity, null)}
          partners={partners}
          districts={districts}
          submitLabel="Créer"
        />
      </div>
    </div>
  );
}
