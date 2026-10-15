import { notFound } from "next/navigation";
import { z } from "zod";
import { BackLink } from "@/components/ui/back-link";
import { EntityForm } from "@/components/admin/entity-form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { createClient } from "@/lib/supabase/server";
import { ENTITIES, isEntity } from "@/lib/admin-entities";
import { formLookups } from "@/lib/admin-form-data";
import { deleteEntity, saveEntity } from "../../crud-actions";
import { grantPartnerAccess, removePartnerMember } from "../../partner-actions";
import { GrantAccessForm } from "@/components/admin/partner-access";

export const metadata = { title: "Modifier" };

export default async function EditEntity({ params }: { params: Promise<{ entity: string; id: string }> }) {
  const { entity, id } = await params;
  if (!isEntity(entity) || !z.uuid().safeParse(id).success) notFound();
  const cfg = ENTITIES[entity];
  const supabase = await createClient();
  const [{ data }, lookups] = await Promise.all([supabase.from(cfg.table).select("*").eq("id", id).maybeSingle(), formLookups()]);
  if (!data) notFound();

  const members =
    entity === "partenaires"
      ? (
          await supabase
            .from("partner_members")
            .select("user_id, created_at, user:profiles(first_name, last_name, email, role)")
            .eq("partner_id", id)
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
          cities={lookups.cities}
          submitLabel="Enregistrer"
        />
      </div>
      {members && (
        <section className="space-y-4 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <div>
            <h2 className="font-bold">Accès à l&apos;espace partenaire</h2>
            <p className="text-muted text-sm">
              Les personnes ci-dessous gèrent les offres et la boutique de ce partenaire, et scannent les
              cartes étudiantes.
            </p>
          </div>
          {members.length > 0 && (
            <ul className="divide-line divide-y text-sm">
              {members.map((m) => (
                <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="min-w-0">
                    <span className="font-semibold">
                      {m.user?.first_name} {m.user?.last_name}
                    </span>{" "}
                    <span className="text-muted break-all">· {m.user?.email}</span>
                  </span>
                  <form action={removePartnerMember.bind(null, id, m.user_id)}>
                    <ConfirmButton
                      message="Retirer l'accès de cette personne ?"
                      className="text-coral-600 hover:bg-coral-50 h-8 rounded-lg px-2 text-xs font-semibold"
                    >
                      Retirer l&apos;accès
                    </ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <GrantAccessForm action={grantPartnerAccess.bind(null, id)} />
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
