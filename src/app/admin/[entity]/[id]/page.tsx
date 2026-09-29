import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { BackLink } from "@/components/ui/back-link";
import { EntityForm } from "@/components/admin/entity-form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { createClient } from "@/lib/supabase/server";
import { ENTITIES, isEntity } from "@/lib/admin-entities";
import { formLookups } from "@/lib/admin-form-data";
import { formatDate } from "@/lib/format";
import { deleteEntity, saveEntity } from "../../crud-actions";

export const metadata = { title: "Modifier" };

export default async function EditEntity({ params }: { params: Promise<{ entity: string; id: string }> }) {
  const { entity, id } = await params;
  if (!isEntity(entity) || !z.uuid().safeParse(id).success) notFound();
  const cfg = ENTITIES[entity];
  const supabase = await createClient();
  const [{ data }, lookups] = await Promise.all([supabase.from(cfg.table).select("*").eq("id", id).maybeSingle(), formLookups()]);
  if (!data) notFound();

  const applications =
    entity === "jobs"
      ? (
          await supabase
            .from("job_applications")
            .select(
              "id, message, created_at, user:profiles(id, first_name, last_name, email, phone, verification_status, field_of_study)",
            )
            .eq("job_id", id)
            .order("created_at", { ascending: false })
        ).data
      : null;

  return (
    <div className="max-w-2xl space-y-5">
      <BackLink href={`/admin/${entity}`} label={cfg.plural} />
      <h1 className="text-2xl font-extrabold tracking-tight">Modifier le {cfg.singular}</h1>
      <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <EntityForm
          fields={cfg.fields}
          initial={data as Record<string, unknown>}
          action={saveEntity.bind(null, entity, id)}
          partners={lookups.partners}
          districts={lookups.districts}
          submitLabel="Enregistrer"
        />
      </div>
      {applications && (
        <section className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-bold">Candidatures ({applications.length})</h2>
          {applications.length === 0 ? (
            <p className="text-muted text-sm">Aucune candidature pour le moment.</p>
          ) : (
            <ul className="divide-line divide-y text-sm">
              {applications.map((a) => (
                <li key={a.id} className="py-3">
                  <Link href={`/admin/utilisateurs/${a.user?.id}`} className="font-semibold hover:underline">
                    {a.user?.first_name} {a.user?.last_name}
                  </Link>
                  <span className="text-muted">
                    {" "}
                    · {a.user?.email} · {a.user?.phone} · {formatDate(a.created_at)}
                  </span>
                  <p className="text-ink/80 mt-1 whitespace-pre-line">{a.message}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <form
        action={deleteEntity.bind(null, entity, id)}
        className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]"
      >
        <h2 className="text-coral-600 font-bold">Zone de danger</h2>
        <p className="text-muted mt-1 text-sm">
          La suppression est définitive{entity === "partenaires" ? " et supprime aussi les avantages de ce partenaire" : ""}.
        </p>
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
